// ShoppingList.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
  Alert,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import {
  Supermarket,
  Product,
  Square,
  ShoppingListProps,
  AmplifyClient,
  PathData,
} from "../../../types";
import { useLocalSearchParams } from "expo-router";
import { getCurrentUser } from "aws-amplify/auth";

// Import our components
import ProductsSection from "./ProductsSection";
import StoreLayoutSection from "./StoreLayoutSection";
import ShoppingListManager from "./ShoppingListManager";
import { Ionicons } from "@expo/vector-icons";
import { tspHeldKarp } from "../../utils/held_karp_tsp_optimal";
import { tspNearestNeighbor } from "../../utils/tsp_heuristic";

// Helper function to convert 2D coordinates to 1D index
const toIndex = (row: number, col: number, cols: number): number =>
  row * cols + col;

// Define a reusable ProductStop type
// In ShoppingList.tsx
type ProductStop = {
  position: [number, number];
  stopNumber: number;
  products: string[];
  isSpecial?: boolean; // Optional flag to indicate special stops
  label?: string; // Optional custom label for special stops
};

const ShoppingList = ({
  supermarketId: propSupermarketId,
}: ShoppingListProps) => {
  // Get the supermarketId from URL params if not provided as props
  const params = useLocalSearchParams();
  const urlSupermarketId =
    typeof params.id === "string" ? params.id : undefined;

  // Use prop value or URL param
  const supermarketId = propSupermarketId || urlSupermarketId;

  const [supermarket, setSupermarket] = useState<Supermarket | null>(null);
  const [layoutData, setLayoutData] = useState<Square[][]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimizedPath, setOptimizedPath] = useState<number[][]>([]);
  const [showOptimizedPath, setShowOptimizedPath] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(
    null
  );
  const [optimizedPathData, setOptimizedPathData] = useState<PathData | null>(
    null
  );
  const [productStops, setProductStops] = useState<ProductStop[]>([]);

  const client = generateClient() as unknown as AmplifyClient;

  // Map product IDs to names for quick lookup (used by ShoppingListManager expand view)
  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p?.id && typeof p.title === "string") {
        map.set(p.id, p.title);
      }
    }
    return map;
  }, [products]);

  const resolveProductName = useCallback(
    (id: string): string | undefined => {
      return productNameById.get(id);
    },
    [productNameById]
  );

  // Fetch the current authenticated user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfo = await getCurrentUser();
        setCurrentUser({
          username: userInfo.username,
        });
        console.log("Current user loaded:", userInfo.username);
      } catch (err) {
        console.log("Not authenticated", err);
        setCurrentUser(null);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (supermarketId) {
      fetchSupermarketData();
    } else {
      setError("No supermarket selected");
      setLoading(false);
    }
  }, [supermarketId]);

  // Fetch the supermarket data and products
  const fetchSupermarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supermarketId) {
        setError("No supermarket selected");
        setLoading(false);
        return;
      }

      // Try using list with a filter instead of get to retrieve pathData
      const supermarketsResponse = await client.models.Supermarket.list({
        filter: { id: { eq: supermarketId } },
      });

      const supermarketData = supermarketsResponse.data?.[0];

      if (supermarketData) {
        console.log("Found supermarket via list:", supermarketData.id);
        console.log("Supermarket properties:", Object.keys(supermarketData));
        console.log("Raw pathData from list:", supermarketData.pathData);

        setSupermarket(supermarketData);

        // Fetch products for this supermarket
        const productsResponse = await client.models.Product.list({
          filter: { supermarketID: { eq: supermarketId } },
        });

        if (productsResponse.data && productsResponse.data.length > 0) {
          console.log("Products Count:", productsResponse.data.length);
          setProducts(productsResponse.data);
        } else {
          console.warn("No products found for this supermarket");
          setProducts([]);
        }

        // Parse the layout
        if (supermarketData.layout) {
          try {
            const layoutJson =
              typeof supermarketData.layout === "string"
                ? JSON.parse(supermarketData.layout)
                : supermarketData.layout;

            console.log("Layout parsed successfully");
            setLayoutData(layoutJson);
          } catch (parseError) {
            console.error("Error parsing layout:", parseError);
            setLayoutData([]);
          }
        }

        // Parse pathData if it exists
        if (supermarketData.pathData) {
          try {
            const pathDataJson =
              typeof supermarketData.pathData === "string"
                ? JSON.parse(supermarketData.pathData)
                : supermarketData.pathData;

            console.log(
              "PathData parsed successfully:",
              pathDataJson.metadata?.timestamp || "no timestamp"
            );
            setOptimizedPathData(pathDataJson);
          } catch (parseError) {
            console.error("Error parsing pathData:", parseError);
            setOptimizedPathData(null);
          }
        } else {
          console.log("No path data available for this supermarket");
          setOptimizedPathData(null);
        }
      } else {
        setError("Supermarket not found");
      }
    } catch (err) {
      console.error("Detailed Error fetching supermarket data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load supermarket data"
      );
    } finally {
      setLoading(false);
    }
  };

  // MODULARIZED PATH GENERATION FUNCTIONS

  /**
   * Generate product square stops instead of access point stops for better UX
   * Returns product squares directly with their sequential numbering
   */
  const generateProductSquareStops = (productSquares: any[], entranceCoord: { row: number; col: number }, finalDestination: { row: number; col: number } | null) => {
    const cols = layoutData[0].length;
    console.log(`🎯 [PRODUCT_STOPS] Generating product square stops for ${productSquares.length} squares`);

    // Check if we have optimized path data
    if (!optimizedPathData?.dist) {
      console.error(`🎯 [PRODUCT_STOPS] No optimized path data available`);
      return { stops: [], optimalProductOrder: [] };
    }

    // Convert product squares to coordinates for TSP
    const productCoords = productSquares.map((square) => ({
      row: square.row,
      col: square.col,
    }));

    // Use TSP to find optimal order to visit the product squares
    const TSP_OPTIMAL_THRESHOLD = 15;
    const useHeuristic = productCoords.length > TSP_OPTIMAL_THRESHOLD;

    console.log(`🎯 [PRODUCT_STOPS] Using ${useHeuristic ? 'heuristic' : 'optimal'} TSP algorithm for ${productCoords.length} product squares`);

    const optimalProductOrder = useHeuristic
      ? tspNearestNeighbor(
          productCoords,
          optimizedPathData.dist,
          cols,
          entranceCoord
        )
      : tspHeldKarp(
          productCoords,
          optimizedPathData.dist,
          cols,
          entranceCoord
        );

    // Create ordered list of product stops
    console.log(`🎯 [PRODUCT_STOPS] Creating stops for visualization`);

    const stops: ProductStop[] = [
      // First stop is always the entrance
      {
        position: [entranceCoord.row, entranceCoord.col],
        stopNumber: 0,
        products: [],
        isSpecial: true,
        label: "Start",
      },
    ];

    // Add product squares in optimal order (skip entrance if it's included)
    const productSquaresToProcess = optimalProductOrder.filter(coord =>
      !(coord.row === entranceCoord.row && coord.col === entranceCoord.col)
    );

    for (let i = 0; i < productSquaresToProcess.length; i++) {
      const productCoord = productSquaresToProcess[i];

      // Find the corresponding product square
      const productSquare = productSquares.find(square =>
        square.row === productCoord.row && square.col === productCoord.col
      );

      if (productSquare) {
        console.log(`🎯 [PRODUCT_STOPS] Adding product square stop ${i + 1}: (${productSquare.row}, ${productSquare.col}) with ${productSquare.products.length} products`);
        console.log(`🎯 [PRODUCT_STOPS] Stop ${i + 1} products: [${productSquare.products.join(', ')}]`);

        stops.push({
          position: [productSquare.row, productSquare.col] as [number, number],
          stopNumber: i + 1,
          products: productSquare.products,
        });
      }
    }

    // Add final destination as last stop if available
    if (finalDestination) {
      console.log(`🎯 [PRODUCT_STOPS] Adding final destination stop: (${finalDestination.row}, ${finalDestination.col})`);
      stops.push({
        position: [finalDestination.row, finalDestination.col],
        stopNumber: 0,
        products: [],
        isSpecial: true,
        label: "Finish",
      });
    }

    console.log(`🎯 [PRODUCT_STOPS] Created ${stops.length} total stops`);
    return { stops, optimalProductOrder };
  };  /**
   * Helper function to check if a square is walkable (only empty squares are walkable)
   */
  const isWalkable = (row: number, col: number): boolean => {
    if (
      row < 0 ||
      row >= layoutData.length ||
      col < 0 ||
      col >= layoutData[0].length
    ) {
      // Only log out-of-bounds for first few calls to avoid spam
      if (Math.random() < 0.001) { // Log ~0.1% of out-of-bounds checks
        console.log(`🚫 [WALKABLE] Out of bounds check: (${row}, ${col}) - bounds: [0-${layoutData.length - 1}, 0-${layoutData[0]?.length - 1 || 0}]`);
      }
      return false;
    }

    const squareType = layoutData[row][col].type;
    const walkable = squareType === "empty";

    // Log non-walkable squares occasionally to help debug
    if (!walkable && Math.random() < 0.005) { // Log ~0.5% of non-walkable checks
      console.log(`🚫 [WALKABLE] Non-walkable square at (${row}, ${col}): type = ${squareType}`);
    }

    return walkable;
  };

  /**
   * Helper function to check if a square is a special location (entrance, exit, cash_register)
   */
  const isSpecialLocation = (row: number, col: number): boolean => {
    if (
      row < 0 ||
      row >= layoutData.length ||
      col < 0 ||
      col >= layoutData[0].length
    ) {
      return false;
    }
    const squareType = layoutData[row][col].type;
    return ["entrance", "exit", "cash_register"].includes(squareType);
  };

  /**
   * Find entrance, exit, and cash register locations in the layout
   */
  const findKeyLocations = () => {
    let entranceCoord: { row: number; col: number } | undefined;
    let cashRegisterCoord: { row: number; col: number } | undefined;
    let exitCoord: { row: number; col: number } | undefined;

    for (let i = 0; i < layoutData.length; i++) {
      for (let j = 0; j < layoutData[i].length; j++) {
        const square = layoutData[i][j];
        if (square.type === "entrance") {
          entranceCoord = { row: i, col: j };
        } else if (square.type === "cash_register") {
          cashRegisterCoord = { row: i, col: j };
        } else if (square.type === "exit") {
          exitCoord = { row: i, col: j };
        }
      }
    }

    return { entranceCoord, cashRegisterCoord, exitCoord };
  };

  /**
   * Find product squares that contain selected products
   */
  const findProductSquares = () => {
    const cols = layoutData[0].length;
    const productSquares: {
      row: number;
      col: number;
      index: number;
      products: string[];
    }[] = [];

    for (let i = 0; i < layoutData.length; i++) {
      for (let j = 0; j < layoutData[i].length; j++) {
        const square = layoutData[i][j];
        if (square.type === "products") {
          const matchingProducts = square.productIds.filter((id) =>
            selectedProducts.includes(id)
          );

          if (matchingProducts.length > 0) {
            productSquares.push({
              row: i,
              col: j,
              index: toIndex(i, j, cols),
              products: matchingProducts,
            });
          }
        }
      }
    }

    return productSquares;
  };

  /**
   * Find walkable access points adjacent to product squares
   */
  const findProductAccessPoints = (productSquares: any[]) => {
    const cols = layoutData[0].length;
    const accessPoints: {
      productIndex: number;
      walkableIndex: number;
      walkableRow: number;
      walkableCol: number;
      distance: number;
    }[] = [];

    for (const product of productSquares) {
      // Check the 4 orthogonal neighbors
      const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];

      for (const [dr, dc] of directions) {
        const r = product.row + dr;
        const c = product.col + dc;

        if (isWalkable(r, c)) {
          const walkableIndex = toIndex(r, c, cols);

          accessPoints.push({
            productIndex: product.index,
            walkableIndex: walkableIndex,
            walkableRow: r,
            walkableCol: c,
            distance: 1, // Adjacent squares have distance 1
          });
        }
      }
    }

    return accessPoints;
  };

  /**
   * Group access points by coordinates and collect all product squares that use each access point
   */
  const selectBestAccessPoints = (
    accessPoints: any[],
    entranceCoord: { row: number; col: number } | undefined,
    productSquares: any[]
  ) => {
    const cols = layoutData[0].length;

    // First, find the best access point for each product square individually
    const accessPointsByProduct = new Map<
      number,
      {
        walkableIndex: number;
        walkableRow: number;
        walkableCol: number;
      }[]
    >();

    // Group access points by product square
    for (const point of accessPoints) {
      if (!accessPointsByProduct.has(point.productIndex)) {
        accessPointsByProduct.set(point.productIndex, []);
      }
      accessPointsByProduct.get(point.productIndex)!.push({
        walkableIndex: point.walkableIndex,
        walkableRow: point.walkableRow,
        walkableCol: point.walkableCol,
      });
    }

    // Choose best access point for each product square
    const bestAccessPointsPerProduct: {
      productIndex: number;
      walkableIndex: number;
      walkableRow: number;
      walkableCol: number;
    }[] = [];

    for (const [productIndex, accessPoints] of accessPointsByProduct.entries()) {
      let bestAccessPoint = accessPoints[0];
      let bestDistance = Infinity;

      const entranceIndex = entranceCoord
        ? toIndex(entranceCoord.row, entranceCoord.col, cols)
        : -1;

      if (entranceIndex !== -1 && optimizedPathData?.dist) {
        for (const accessPoint of accessPoints) {
          const distance =
            optimizedPathData.dist[entranceIndex][accessPoint.walkableIndex];
          if (distance < bestDistance) {
            bestDistance = distance;
            bestAccessPoint = accessPoint;
          }
        }
      }

      bestAccessPointsPerProduct.push({
        productIndex,
        walkableIndex: bestAccessPoint.walkableIndex,
        walkableRow: bestAccessPoint.walkableRow,
        walkableCol: bestAccessPoint.walkableCol,
      });
    }

    // Now group by access point coordinates and collect all product squares that use each access point
    const accessPointGroups = new Map<string, {
      accessPoint: { row: number; col: number; walkableIndex: number };
      productSquares: typeof productSquares;
      allProductIds: string[];
    }>();

    for (const bestAP of bestAccessPointsPerProduct) {
      const accessKey = `${bestAP.walkableRow},${bestAP.walkableCol}`;

      if (!accessPointGroups.has(accessKey)) {
        accessPointGroups.set(accessKey, {
          accessPoint: {
            row: bestAP.walkableRow,
            col: bestAP.walkableCol,
            walkableIndex: bestAP.walkableIndex
          },
          productSquares: [],
          allProductIds: []
        });
      }

      // Find the product square for this productIndex
      const productSquare = productSquares.find(ps => ps.index === bestAP.productIndex);
      if (productSquare) {
        const group = accessPointGroups.get(accessKey)!;
        group.productSquares.push(productSquare);
        group.allProductIds.push(...productSquare.products);
      }
    }

    // Log the results for debugging
    console.log(`🔍 [ACCESS_POINTS] Found ${accessPointGroups.size} unique access points:`);
    for (const [accessKey, group] of accessPointGroups) {
      console.log(`🔍 [ACCESS_POINTS] Access point (${group.accessPoint.row}, ${group.accessPoint.col}): ${group.productSquares.length} squares, ${group.allProductIds.length} products`);
      console.log(`🔍 [ACCESS_POINTS] Products: [${group.allProductIds.join(', ')}]`);
    }

    return Array.from(accessPointGroups.values());
  };

  /**
   * Generate a path between two points using Floyd-Warshall data
   * without going through non-walkable squares
   */
  /**
   * Generate a path between two points using BFS to ensure only empty squares are used
   */
  const generatePathBetweenPoints = (
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    cols: number
  ) => {
    console.log(`🔍 [PATH_GEN] Starting pathfinding from (${startRow}, ${startCol}) to (${endRow}, ${endCol})`);

    // Log square types at start and end positions
    console.log(`🔍 [PATH_GEN] Start square type: ${layoutData[startRow]?.[startCol]?.type || 'OUT_OF_BOUNDS'}`);
    console.log(`🔍 [PATH_GEN] End square type: ${layoutData[endRow]?.[endCol]?.type || 'OUT_OF_BOUNDS'}`);
    console.log(`🔍 [PATH_GEN] Start walkable: ${isWalkable(startRow, startCol)}`);
    console.log(`🔍 [PATH_GEN] End walkable: ${isWalkable(endRow, endCol)}`);

    // Check if there's a direct adjacency to avoid going through products
    const isAdjacent =
      Math.abs(startRow - endRow) + Math.abs(startCol - endCol) <= 1;
    console.log(`🔍 [PATH_GEN] Is adjacent: ${isAdjacent} (distance: ${Math.abs(startRow - endRow) + Math.abs(startCol - endCol)})`);

    if (isAdjacent) {
      console.log(`✅ [PATH_GEN] Using direct adjacent path: [(${endRow}, ${endCol})]`);
      return [[endRow, endCol]];
    }

    const startIndex = toIndex(startRow, startCol, cols);
    const endIndex = toIndex(endRow, endCol, cols);
    console.log(`🔍 [PATH_GEN] Start index: ${startIndex}, End index: ${endIndex}, Grid cols: ${cols}`);

    // Try to find a path only through walkable squares
    let visited = new Set<number>();
    let queue: { index: number; path: number[][] }[] = [];

    // Start BFS from the current position
    queue.push({
      index: startIndex,
      path: [],
    });
    visited.add(startIndex);
    console.log(`🔍 [PATH_GEN] BFS initialized. Queue size: 1, Visited: [${startIndex}]`);

    let iterations = 0;
    const MAX_ITERATIONS = 10000; // Prevent infinite loops

    // Explore all possible paths using BFS
    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const { index, path: currentPath } = queue.shift()!;
      const currentRow = Math.floor(index / cols);
      const currentCol = index % cols;

      if (iterations % 1000 === 0) {
        console.log(`🔍 [PATH_GEN] BFS iteration ${iterations}, queue size: ${queue.length}, visited size: ${visited.size}`);
        console.log(`🔍 [PATH_GEN] Current position: (${currentRow}, ${currentCol}), path length: ${currentPath.length}`);
      }

      // Check all four directions (orthogonal neighbors)
      const directions = [
        [0, 1],  // Right
        [1, 0],  // Down
        [0, -1], // Left
        [-1, 0], // Up
      ];

      for (const [dr, dc] of directions) {
        const newRow = currentRow + dr;
        const newCol = currentCol + dc;
        const newIndex = toIndex(newRow, newCol, cols);

        // Check bounds first
        const inBounds = newRow >= 0 && newRow < layoutData.length && newCol >= 0 && newCol < layoutData[0].length;

        if (!inBounds) {
          continue; // Skip out of bounds
        }

        const isWalkableSquare = isWalkable(newRow, newCol);
        const alreadyVisited = visited.has(newIndex);

        // Check if valid and walkable (empty)
        if (isWalkableSquare && !alreadyVisited) {
          // Create a new path with this step
          const newPath = [...currentPath, [newRow, newCol]];

          // If we reached the destination
          if (newIndex === endIndex) {
            console.log(`✅ [PATH_GEN] Destination reached! Path found with ${newPath.length} steps`);
            console.log(`✅ [PATH_GEN] Final path: ${JSON.stringify(newPath)}`);
            console.log(`✅ [PATH_GEN] BFS completed in ${iterations} iterations`);
            return newPath;
          }

          // Otherwise continue BFS
          visited.add(newIndex);
          queue.push({ index: newIndex, path: newPath });
        } else if (!isWalkableSquare && iterations < 10) {
          // Log blocking squares for first few iterations only
          console.log(`🚫 [PATH_GEN] Blocked at (${newRow}, ${newCol}) - type: ${layoutData[newRow][newCol].type}`);
        }
      }
    }

    // If no path found through walkable squares, return empty path
    if (iterations >= MAX_ITERATIONS) {
      console.error(`❌ [PATH_GEN] BFS exceeded maximum iterations (${MAX_ITERATIONS}) - possible infinite loop`);
      console.error(`❌ [PATH_GEN] Final queue size: ${queue.length}, visited size: ${visited.size}`);
    } else {
      console.error(`❌ [PATH_GEN] No walkable path found from (${startRow}, ${startCol}) to (${endRow}, ${endCol})`);
      console.error(`❌ [PATH_GEN] BFS completed in ${iterations} iterations, explored ${visited.size} squares`);
    }

    // Log surrounding squares for debugging
    console.log(`🔍 [PATH_GEN] Debugging - Start position surroundings:`);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = startRow + dr;
        const c = startCol + dc;
        if (r >= 0 && r < layoutData.length && c >= 0 && c < layoutData[0].length) {
          console.log(`   (${r}, ${c}): ${layoutData[r][c].type} - walkable: ${isWalkable(r, c)}`);
        }
      }
    }

    console.log(`🔍 [PATH_GEN] Debugging - End position surroundings:`);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = endRow + dr;
        const c = endCol + dc;
        if (r >= 0 && r < layoutData.length && c >= 0 && c < layoutData[0].length) {
          console.log(`   (${r}, ${c}): ${layoutData[r][c].type} - walkable: ${isWalkable(r, c)}`);
        }
      }
    }

    return [];
  };

  /**
   * Remove duplicate consecutive points from a path
   */
  const removeDuplicates = (path: number[][]) => {
    console.log(`🧹 [PATH_CLEAN] Starting duplicate removal. Input path length: ${path.length}`);
    console.log(`🧹 [PATH_CLEAN] Input path: ${JSON.stringify(path.slice(0, 10))}${path.length > 10 ? '...' : ''}`);

    const cleaned = path.filter((point, index, array) => {
      // Keep the point if it's the first one or different from the previous one
      const keep = index === 0 ||
        point[0] !== array[index - 1][0] ||
        point[1] !== array[index - 1][1];

      if (!keep && index < 20) { // Log first 20 duplicates only
        console.log(`🧹 [PATH_CLEAN] Removing duplicate at index ${index}: (${point[0]}, ${point[1]})`);
      }

      return keep;
    });

    const duplicatesRemoved = path.length - cleaned.length;
    console.log(`✅ [PATH_CLEAN] Duplicate removal complete. Removed ${duplicatesRemoved} duplicates. Final length: ${cleaned.length}`);

    return cleaned;
  };

  /**
   * Validate the generated path to ensure all points are walkable
   */
  const validatePath = (path: number[][]) => {
    console.log(`🔍 [PATH_VALIDATE] Starting path validation. Path length: ${path.length}`);

    if (path.length === 0) {
      console.warn(`⚠️ [PATH_VALIDATE] Empty path provided for validation`);
      return path;
    }

    // Find any non-walkable points in the path
    const invalidPoints = path.filter((point, index) => {
      const [row, col] = point;
      const walkable = isWalkable(row, col);

      if (!walkable) {
        const squareType = (row >= 0 && row < layoutData.length && col >= 0 && col < layoutData[0].length)
          ? layoutData[row][col].type
          : 'OUT_OF_BOUNDS';
        console.error(`❌ [PATH_VALIDATE] Invalid point at index ${index}: (${row}, ${col}) - type: ${squareType}`);
      }

      return !walkable;
    });

    if (invalidPoints.length > 0) {
      console.error(`❌ [PATH_VALIDATE] Found ${invalidPoints.length} non-walkable points in path:`);
      invalidPoints.forEach((point, index) => {
        const [row, col] = point;
        const squareType = (row >= 0 && row < layoutData.length && col >= 0 && col < layoutData[0].length)
          ? layoutData[row][col].type
          : 'OUT_OF_BOUNDS';
        console.error(`   ${index + 1}. (${row}, ${col}) - type: ${squareType}`);
      });

      // Filter out non-walkable squares
      const validPath = path.filter((point) => {
        const [row, col] = point;
        return isWalkable(row, col);
      });

      console.warn(`🔧 [PATH_VALIDATE] Filtered out invalid points. Original length: ${path.length}, Valid length: ${validPath.length}`);

      // Log the continuity of the filtered path
      for (let i = 1; i < validPath.length; i++) {
        const prev = validPath[i - 1];
        const curr = validPath[i];
        const distance = Math.abs(prev[0] - curr[0]) + Math.abs(prev[1] - curr[1]);
        if (distance > 1) {
          console.warn(`⚠️ [PATH_VALIDATE] Gap detected between points ${i - 1} and ${i}: (${prev[0]}, ${prev[1]}) to (${curr[0]}, ${curr[1]}) - distance: ${distance}`);
        }
      }

      return validPath;
    }

    console.log(`✅ [PATH_VALIDATE] Path validation passed. All ${path.length} points are walkable.`);

    // Validate path continuity
    let discontinuities = 0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const distance = Math.abs(prev[0] - curr[0]) + Math.abs(prev[1] - curr[1]);
      if (distance > 1) {
        discontinuities++;
        if (discontinuities <= 5) { // Log first 5 discontinuities only
          console.warn(`⚠️ [PATH_VALIDATE] Discontinuity ${discontinuities} between points ${i - 1} and ${i}: (${prev[0]}, ${prev[1]}) to (${curr[0]}, ${curr[1]}) - distance: ${distance}`);
        }
      }
    }

    if (discontinuities > 0) {
      console.warn(`⚠️ [PATH_VALIDATE] Found ${discontinuities} discontinuities in path (gaps > 1 square)`);
    } else {
      console.log(`✅ [PATH_VALIDATE] Path continuity validated - all steps are adjacent`);
    }

    return path;
  };

  /**
   * Main function to generate an optimized path
   */
  const generateOptimizedPath = () => {
    console.log(`🚀 [INIT] ===============================================`);
    console.log(`🚀 [INIT] Starting generateOptimizedPath function`);
    console.log(`🚀 [INIT] Layout data dimensions: ${layoutData.length}x${layoutData[0]?.length || 0}`);
    console.log(`🚀 [INIT] Selected products count: ${selectedProducts.length}`);
    console.log(`🚀 [INIT] Selected products: ${JSON.stringify(selectedProducts.slice(0, 10))}${selectedProducts.length > 10 ? '...' : ''}`);
    console.log(`🚀 [INIT] Has path data: ${!!(optimizedPathData?.dist && optimizedPathData?.next)}`);

    if (layoutData.length === 0) {
      console.error(`❌ [INIT] Layout data is empty! Cannot generate path.`);
      return;
    }

    if (selectedProducts.length === 0) {
      console.warn(`⚠️ [INIT] No products selected! Cannot generate path.`);
      return;
    }

    // If we have precomputed path data, use it for optimal routing
    if (optimizedPathData?.dist && optimizedPathData?.next) {
      console.log(`✅ [INIT] Using precomputed path data for optimization`);
      console.log(`✅ [INIT] Distance matrix size: ${optimizedPathData.dist.length}x${optimizedPathData.dist[0]?.length || 0}`);
      console.log(`✅ [INIT] Next hop matrix size: ${optimizedPathData.next.length}x${optimizedPathData.next[0]?.length || 0}`);

      const cols = layoutData[0].length;
      console.log(`✅ [INIT] Grid columns: ${cols}`);

      // Step 1: Find key locations (entrance, cash register, exit)
      console.log(`🔍 [INIT] Step 1: Finding key locations...`);
      const { entranceCoord, cashRegisterCoord, exitCoord } =
        findKeyLocations();

      console.log(`🔍 [INIT] Entrance: ${entranceCoord ? `(${entranceCoord.row}, ${entranceCoord.col})` : 'NOT FOUND'}`);
      console.log(`🔍 [INIT] Cash register: ${cashRegisterCoord ? `(${cashRegisterCoord.row}, ${cashRegisterCoord.col})` : 'NOT FOUND'}`);
      console.log(`🔍 [INIT] Exit: ${exitCoord ? `(${exitCoord.row}, ${exitCoord.col})` : 'NOT FOUND'}`);

      if (!entranceCoord) {
        console.error(`❌ [INIT] No entrance found in layout! Cannot proceed.`);
        return;
      }

      const finalDestination = cashRegisterCoord || exitCoord;
      if (!finalDestination) {
        console.warn(`⚠️ [INIT] No cash register or exit found - will end at last product`);
      } else {
        console.log(`✅ [INIT] Final destination: (${finalDestination.row}, ${finalDestination.col})`);
      }

      // Step 2: Find product squares that contain selected products
      console.log(`🔍 [INIT] Step 2: Finding product squares...`);
      const productSquares = findProductSquares();
      console.log(`🔍 [INIT] Found ${productSquares.length} product squares containing selected items`);

      // If no product squares found, create a simple path
      if (productSquares.length === 0) {
        console.warn("No product squares found for selected products");
        const simplePath: number[][] = [];

        // Add walkable squares adjacent to entrance
        const entranceAdjacentSquares = findAdjacentWalkableSquares(
          entranceCoord.row,
          entranceCoord.col
        );
        if (entranceAdjacentSquares.length > 0) {
          simplePath.push([
            entranceAdjacentSquares[0].row,
            entranceAdjacentSquares[0].col,
          ]);
        }

        // Add walkable squares adjacent to final destination
        if (finalDestination) {
          const destAdjacentSquares = findAdjacentWalkableSquares(
            finalDestination.row,
            finalDestination.col
          );
          if (destAdjacentSquares.length > 0) {
            simplePath.push([
              destAdjacentSquares[0].row,
              destAdjacentSquares[0].col,
            ]);
          }
        }

        setOptimizedPath(simplePath);

        // Set entrance and exit as special stops (consistent with main path numbering)
        const specialStops: ProductStop[] = [
          {
            position: [entranceCoord.row, entranceCoord.col],
            stopNumber: 0,
            products: [],
            isSpecial: true,
            label: "Start",
          },
        ];

        if (finalDestination) {
          specialStops.push({
            position: [finalDestination.row, finalDestination.col],
            stopNumber: 0,
            products: [],
            isSpecial: true,
            label: "Finish",
          });
        }

        setProductStops(specialStops);
        setShowOptimizedPath(true);
        return;
      }

      // Step 3-7: Use new product square approach instead of access points
      console.log(`🎯 [NEW_APPROACH] Switching to product square stops instead of access points`);

      // Notify user about algorithm choice for large lists
      const TSP_OPTIMAL_THRESHOLD = 15;
      const useHeuristic = productSquares.length > TSP_OPTIMAL_THRESHOLD;

      if (useHeuristic) {
        Alert.alert(
          "Large Shopping List",
          `You have ${selectedProducts.length} products selected. For performance, we'll use a fast heuristic algorithm that provides very good (but not necessarily optimal) paths.`,
          [{ text: "OK" }]
        );
      }

      // Generate product square stops with TSP optimization
      const { stops: productStopsArray, optimalProductOrder } = generateProductSquareStops(
        productSquares,
        entranceCoord,
        finalDestination || null
      );

      // Set the product stops for visualization
      setProductStops(productStopsArray);      // For the walkable path, we need access points to navigate around product squares
      console.log(`🚀 [PATH_GEN] Generating walkable path through access points while displaying numbers on product squares`);

      // Find access points for navigation purposes (but don't display numbers on them)
      const accessPoints = findProductAccessPoints(productSquares);

      // Find access points for entrance and destination
      const entranceAccessPoints = findAdjacentWalkableSquares(
        entranceCoord.row,
        entranceCoord.col
      );
      const entranceAccessPoint =
        entranceAccessPoints.length > 0 ? entranceAccessPoints[0] : null;

      let destinationAccessPoint = null;
      if (finalDestination) {
        const destAccessPoints = findAdjacentWalkableSquares(
          finalDestination.row,
          finalDestination.col
        );
        destinationAccessPoint =
          destAccessPoints.length > 0 ? destAccessPoints[0] : null;
      }

      // For each product square in the optimal order, find its best access point
      const orderedAccessPoints: { row: number; col: number }[] = [];

      for (const productCoord of optimalProductOrder) {
        // Find access points for this specific product square
        const productIndex = toIndex(productCoord.row, productCoord.col, cols);
        const productAccessPoints = accessPoints.filter(ap => ap.productIndex === productIndex);

        if (productAccessPoints.length > 0) {
          // Choose the best access point (closest to entrance for simplicity)
          let bestAccessPoint = productAccessPoints[0];
          let bestDistance = Infinity;

          const entranceIndex = entranceCoord ? toIndex(entranceCoord.row, entranceCoord.col, cols) : -1;

          if (entranceIndex !== -1 && optimizedPathData?.dist) {
            for (const ap of productAccessPoints) {
              const distance = optimizedPathData.dist[entranceIndex][ap.walkableIndex];
              if (distance < bestDistance) {
                bestDistance = distance;
                bestAccessPoint = ap;
              }
            }
          }

          orderedAccessPoints.push({
            row: bestAccessPoint.walkableRow,
            col: bestAccessPoint.walkableCol
          });
        }
      }

      // Step 8: Generate a path through walkable access points (for navigation)
      console.log(`🚀 [PATH_MAIN] Starting main path generation phase`);
      console.log(`🚀 [PATH_MAIN] Entrance access point: ${entranceAccessPoint ? `(${entranceAccessPoint.row}, ${entranceAccessPoint.col})` : 'None'}`);
      console.log(`🚀 [PATH_MAIN] Destination access point: ${destinationAccessPoint ? `(${destinationAccessPoint.row}, ${destinationAccessPoint.col})` : 'None'}`);
      console.log(`🚀 [PATH_MAIN] Ordered access points length: ${orderedAccessPoints.length}`);

      const walkablePath: number[][] = [];

      // Start with a walkable square adjacent to entrance
      if (entranceAccessPoint) {
        walkablePath.push([entranceAccessPoint.row, entranceAccessPoint.col]);
        console.log(`🚀 [PATH_MAIN] Added entrance access point to path: (${entranceAccessPoint.row}, ${entranceAccessPoint.col})`);
      } else {
        console.warn(`⚠️ [PATH_MAIN] No entrance access point available`);
      }

      let lastPosition = entranceAccessPoint || entranceCoord;
      console.log(`🚀 [PATH_MAIN] Starting position: (${lastPosition.row}, ${lastPosition.col})`);

      // Generate paths between access points
      console.log(`🚀 [PATH_MAIN] Generating paths between ${orderedAccessPoints.length} access points`);
      for (let i = 0; i < orderedAccessPoints.length; i++) {
        const accessPoint = orderedAccessPoints[i];
        console.log(`🚀 [PATH_MAIN] === Processing access point ${i + 1}/${orderedAccessPoints.length}: (${accessPoint.row}, ${accessPoint.col}) ===`);

        if (lastPosition) {
          console.log(`🚀 [PATH_MAIN] Generating path from (${lastPosition.row}, ${lastPosition.col}) to (${accessPoint.row}, ${accessPoint.col})`);

          const pathSegment = generatePathBetweenPoints(
            lastPosition.row,
            lastPosition.col,
            accessPoint.row,
            accessPoint.col,
            cols
          );

          console.log(`🚀 [PATH_MAIN] Path segment result: ${pathSegment.length} steps`);
          if (pathSegment.length > 0) {
            console.log(`🚀 [PATH_MAIN] Adding ${pathSegment.length} steps to walkable path`);
            console.log(`🚀 [PATH_MAIN] Segment: ${JSON.stringify(pathSegment.slice(0, 5))}${pathSegment.length > 5 ? '...' : ''}`);
            walkablePath.push(...pathSegment);
            console.log(`🚀 [PATH_MAIN] Total walkable path length now: ${walkablePath.length}`);
          } else {
            console.error(`❌ [PATH_MAIN] Failed to generate path segment ${i + 1}! No walkable path found.`);
          }
        } else {
          console.error(`❌ [PATH_MAIN] No last position available for access point ${i + 1}`);
        }

        lastPosition = { row: accessPoint.row, col: accessPoint.col };
        console.log(`🚀 [PATH_MAIN] Updated last position to: (${lastPosition.row}, ${lastPosition.col})`);
      }

      // Add path to final destination access point if available
      if (destinationAccessPoint && lastPosition) {
        console.log(`🚀 [PATH_MAIN] === Generating final path to destination ===`);
        console.log(`🚀 [PATH_MAIN] From (${lastPosition.row}, ${lastPosition.col}) to destination (${destinationAccessPoint.row}, ${destinationAccessPoint.col})`);

        const pathToDestination = generatePathBetweenPoints(
          lastPosition.row,
          lastPosition.col,
          destinationAccessPoint.row,
          destinationAccessPoint.col,
          cols
        );

        console.log(`🚀 [PATH_MAIN] Destination path result: ${pathToDestination.length} steps`);
        if (pathToDestination.length > 0) {
          console.log(`🚀 [PATH_MAIN] Adding final ${pathToDestination.length} steps to walkable path`);
          walkablePath.push(...pathToDestination);
          console.log(`🚀 [PATH_MAIN] Final total walkable path length: ${walkablePath.length}`);
        } else {
          console.error(`❌ [PATH_MAIN] Failed to generate path to destination!`);
        }
      } else if (!destinationAccessPoint) {
        console.warn(`⚠️ [PATH_MAIN] No destination access point available - skipping final path`);
      } else {
        console.warn(`⚠️ [PATH_MAIN] No last position available for destination path`);
      }

      // Step 9: Product stops were already created in generateProductSquareStops()
      console.log(`📍 [STOPS_GEN] Product stops already created: ${productStopsArray.length} total stops`);
      console.log(`📍 [STOPS_GEN] Stops summary: Start + ${productStopsArray.filter((s: ProductStop) => !s.isSpecial).length} product squares + ${productStopsArray.filter((s: ProductStop) => s.isSpecial && s.label === 'Finish').length > 0 ? 'Finish' : 'No finish'}`);

      // Step 10: Remove duplicates and validate the path
      console.log(`🏁 [PATH_FINAL] Starting final path processing`);
      console.log(`🏁 [PATH_FINAL] Raw walkable path length: ${walkablePath.length}`);
      console.log(`🏁 [PATH_FINAL] Raw path preview: ${JSON.stringify(walkablePath.slice(0, 10))}${walkablePath.length > 10 ? '...' : ''}`);

      const deduplicatedPath = removeDuplicates(walkablePath);
      const validatedPath = validatePath(deduplicatedPath);

      console.log(`🏁 [PATH_FINAL] Final validated path length: ${validatedPath.length}`);
      console.log(`🏁 [PATH_FINAL] Final path preview: ${JSON.stringify(validatedPath.slice(0, 10))}${validatedPath.length > 10 ? '...' : ''}`);

      // Log path statistics
      if (validatedPath.length > 0) {
        const startPoint = validatedPath[0];
        const endPoint = validatedPath[validatedPath.length - 1];
        console.log(`🏁 [PATH_FINAL] Path starts at: (${startPoint[0]}, ${startPoint[1]})`);
        console.log(`🏁 [PATH_FINAL] Path ends at: (${endPoint[0]}, ${endPoint[1]})`);

        // Calculate path efficiency
        const rawLength = walkablePath.length;
        const finalLength = validatedPath.length;
        const duplicatesRemoved = rawLength - deduplicatedPath.length;
        const invalidPointsRemoved = deduplicatedPath.length - finalLength;

        console.log(`📊 [PATH_STATS] Raw path: ${rawLength} points`);
        console.log(`📊 [PATH_STATS] Duplicates removed: ${duplicatesRemoved} points`);
        console.log(`📊 [PATH_STATS] Invalid points removed: ${invalidPointsRemoved} points`);
        console.log(`📊 [PATH_STATS] Final path: ${finalLength} points`);
        console.log(`📊 [PATH_STATS] Path efficiency: ${((finalLength / rawLength) * 100).toFixed(1)}%`);
      } else {
        console.error(`❌ [PATH_FINAL] Final path is empty! This indicates a critical pathfinding failure.`);
      }

      setOptimizedPath(validatedPath);
      setShowOptimizedPath(true);

      console.log(`✅ [PATH_COMPLETE] Path generation completed successfully!`);
      console.log(`✅ [PATH_COMPLETE] Generated optimized path with ${validatedPath.length} steps and ${productStopsArray.length} stops`);
      console.log(`✅ [PATH_COMPLETE] Path generation phase finished`);
      console.log(`===============================================`);
    } else {
      // Fallback for when path data isn't available
      generateSimplePath();
    }
  };

  /**
   * Find walkable squares adjacent to a given position
   */
  const findAdjacentWalkableSquares = (row: number, col: number) => {
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    const adjacentSquares: { row: number; col: number }[] = [];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (isWalkable(newRow, newCol)) {
        adjacentSquares.push({ row: newRow, col: newCol });
      }
    }

    return adjacentSquares;
  };

  /**
   * Generate a simple path when pathData isn't available
   */
  const generateSimplePath = () => {
    console.log("No precomputed path data available, using simple path");

    // Find key locations
    const { entranceCoord, cashRegisterCoord, exitCoord } = findKeyLocations();
    const finalDestination = cashRegisterCoord || exitCoord;

    if (!entranceCoord) {
      console.error("No entrance found in layout");
      return;
    }

    // Find product squares with selected products
    const productLocations: {
      position: [number, number];
      products: string[];
    }[] = [];
    for (let i = 0; i < layoutData.length; i++) {
      for (let j = 0; j < layoutData[i].length; j++) {
        const square = layoutData[i][j];
        if (square.type === "products") {
          const matchingProducts = square.productIds.filter((id) =>
            selectedProducts.includes(id)
          );

          if (matchingProducts.length > 0) {
            productLocations.push({
              position: [i, j],
              products: matchingProducts,
            });
          }
        }
      }
    }

    // Simple path from entrance to final destination
    const simplePath: number[][] = [[entranceCoord.row, entranceCoord.col]];

    // Add final destination if available
    if (finalDestination) {
      simplePath.push([finalDestination.row, finalDestination.col]);
    }

    // Create numbered product stops
    const simpleStops = productLocations.map((location, index) => ({
      position: location.position,
      stopNumber: index + 1,
      products: location.products,
    }));

    setOptimizedPath(simplePath);
    setProductStops(simpleStops);
    setShowOptimizedPath(true);
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prevSelected) => {
      // Check if the product is already selected
      if (prevSelected.includes(productId)) {
        // Remove it from selection
        return prevSelected.filter((id) => id !== productId);
      } else {
        // Add it to selection
        return [...prevSelected, productId];
      }
    });
  };

  // Handle loading a saved shopping list
  const handleShoppingListLoaded = (productIds: string[]) => {
    setSelectedProducts(productIds);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading shopping list...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchSupermarketData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Prepare data for SectionList
  const sections = [
    {
      title: "header",
      data: ["header"],
      renderItem: () => (
        <View style={styles.headerContainer}>
          <Text style={styles.header}>{supermarket?.name} Shopping List</Text>
          {selectedProducts.length > 0 && (
            <Text style={styles.subheader}>
              {selectedProducts.length} item
              {selectedProducts.length !== 1 ? "s" : ""} selected
            </Text>
          )}
        </View>
      ),
    },
    {
      title: "listManager",
      data: ["listManager"],
      renderItem: () =>
        supermarketId ? (
          <ShoppingListManager
            supermarketId={supermarketId}
            selectedProducts={selectedProducts}
            onShoppingListLoaded={handleShoppingListLoaded}
            currentUser={currentUser || undefined}
            resolveProductName={resolveProductName}
          />
        ) : null,
    },
    {
      title: "pathButton",
      data: selectedProducts.length > 0 ? ["pathButton"] : [],
      renderItem: () => (
        <TouchableOpacity
          style={styles.generatePathButton}
          onPress={generateOptimizedPath}
        >
          <Ionicons name="map-outline" size={20} color="white" />
          <Text style={styles.generatePathButtonText}>
            Generate Optimized Path
          </Text>
        </TouchableOpacity>
      ),
    },
    {
      title: "products",
      data: ["products"],
      renderItem: () => (
        <ProductsSection
          products={products}
          selectedProducts={selectedProducts}
          onProductSelect={toggleProductSelection}
          onSelectAll={() => {
            // Select all product IDs from current filtered set (all products list here)
            const allIds = products.map((p) => p.id);
            setSelectedProducts(allIds);
          }}
          onClearAll={() => {
            setSelectedProducts([]);
          }}
        />
      ),
    },
    {
      title: "storeLayout",
      data: ["storeLayout"],
      renderItem: () => (
        <StoreLayoutSection
          layoutData={layoutData}
          selectedProducts={selectedProducts}
          optimizedPath={showOptimizedPath ? optimizedPath : undefined}
          productStops={showOptimizedPath ? productStops : undefined}
          products={products} // Add this line to pass products
        />
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item + index}
        renderSectionHeader={() => null}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.sectionListContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  sectionListContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  headerContainer: {
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  generatePathButton: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  generatePathButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ShoppingList;

// ShoppingList.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    SectionList,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, Product, Square, ShoppingListProps, AmplifyClient, PathData } from "../../../types";
import { useLocalSearchParams } from "expo-router";
import { getCurrentUser } from "aws-amplify/auth";

// Import our components
import ProductsSection from "./ProductsSection";
import StoreLayoutSection from "./StoreLayoutSection";
import ShoppingListManager from "./ShoppingListManager";
import { Ionicons } from "@expo/vector-icons";
import { tspHeldKarp } from "../../utils/held_karp_tsp_optimal";

// Helper function to convert 2D coordinates to 1D index
const toIndex = (row: number, col: number, cols: number): number => row * cols + col;

// Define a reusable ProductStop type
// In ShoppingList.tsx
type ProductStop = {
    position: [number, number];
    stopNumber: number;
    products: string[];
    isSpecial?: boolean;  // Optional flag to indicate special stops
    label?: string;       // Optional custom label for special stops
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
    const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
    const [optimizedPathData, setOptimizedPathData] = useState<PathData | null>(null);
    const [productStops, setProductStops] = useState<ProductStop[]>([]);

    const client = generateClient() as unknown as AmplifyClient;

    // Fetch the current authenticated user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userInfo = await getCurrentUser();
                setCurrentUser({
                    username: userInfo.username
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
                filter: { id: { eq: supermarketId } }
            });

            const supermarketData = supermarketsResponse.data?.[0];

            if (supermarketData) {
                console.log("Found supermarket via list:", supermarketData.id);
                console.log("Supermarket properties:", Object.keys(supermarketData));
                console.log("Raw pathData from list:", supermarketData.pathData);

                setSupermarket(supermarketData);

                // Fetch products for this supermarket
                const productsResponse = await client.models.Product.list({
                    filter: { supermarketID: { eq: supermarketId } }
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
                        const layoutJson = typeof supermarketData.layout === "string"
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
                        const pathDataJson = typeof supermarketData.pathData === "string"
                            ? JSON.parse(supermarketData.pathData)
                            : supermarketData.pathData;

                        console.log("PathData parsed successfully:", pathDataJson.metadata?.timestamp || "no timestamp");
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
            setError(err instanceof Error ? err.message : "Failed to load supermarket data");
        } finally {
            setLoading(false);
        }
    };

    // MODULARIZED PATH GENERATION FUNCTIONS

    /**
     * Helper function to check if a square is walkable (only empty squares are walkable)
     */
    const isWalkable = (row: number, col: number): boolean => {
        if (row < 0 || row >= layoutData.length || col < 0 || col >= layoutData[0].length) {
            return false;
        }
        // Only empty squares are walkable
        return layoutData[row][col].type === "empty";
    };

    /**
     * Helper function to check if a square is a special location (entrance, exit, cash_register)
     */
    const isSpecialLocation = (row: number, col: number): boolean => {
        if (row < 0 || row >= layoutData.length || col < 0 || col >= layoutData[0].length) {
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
                    const matchingProducts = square.productIds.filter(id =>
                        selectedProducts.includes(id)
                    );

                    if (matchingProducts.length > 0) {
                        productSquares.push({
                            row: i,
                            col: j,
                            index: toIndex(i, j, cols),
                            products: matchingProducts
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
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

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
                        distance: 1 // Adjacent squares have distance 1
                    });
                }
            }
        }

        return accessPoints;
    };

    /**
     * Group access points by product and select the best one for each product
     */
    const selectBestAccessPoints = (accessPoints: any[], entranceCoord: { row: number, col: number } | undefined) => {
        const cols = layoutData[0].length;
        const accessPointsByProduct = new Map<number, {
            walkableIndex: number;
            walkableRow: number;
            walkableCol: number;
        }[]>();

        // Group access points by product
        for (const point of accessPoints) {
            if (!accessPointsByProduct.has(point.productIndex)) {
                accessPointsByProduct.set(point.productIndex, []);
            }
            accessPointsByProduct.get(point.productIndex)!.push({
                walkableIndex: point.walkableIndex,
                walkableRow: point.walkableRow,
                walkableCol: point.walkableCol
            });
        }

        // Choose best access point for each product
        const bestAccessPoints: {
            productIndex: number;
            walkableIndex: number;
            walkableRow: number;
            walkableCol: number;
        }[] = [];

        for (const [productIndex, accessPoints] of accessPointsByProduct.entries()) {
            let bestAccessPoint = accessPoints[0];
            let bestDistance = Infinity;

            const entranceIndex = entranceCoord ?
                toIndex(entranceCoord.row, entranceCoord.col, cols) : -1;

            if (entranceIndex !== -1 && optimizedPathData?.dist) {
                for (const accessPoint of accessPoints) {
                    const distance = optimizedPathData.dist[entranceIndex][accessPoint.walkableIndex];
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestAccessPoint = accessPoint;
                    }
                }
            }

            bestAccessPoints.push({
                productIndex,
                walkableIndex: bestAccessPoint.walkableIndex,
                walkableRow: bestAccessPoint.walkableRow,
                walkableCol: bestAccessPoint.walkableCol
            });
        }

        return bestAccessPoints;
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
        // Check if there's a direct adjacency to avoid going through products
        const isAdjacent = Math.abs(startRow - endRow) + Math.abs(startCol - endCol) <= 1;
        if (isAdjacent) {
            return [[endRow, endCol]];
        }

        const startIndex = toIndex(startRow, startCol, cols);
        const endIndex = toIndex(endRow, endCol, cols);

        // Try to find a path only through walkable squares
        let visited = new Set<number>();
        let queue: { index: number; path: number[][] }[] = [];

        // Start BFS from the current position
        queue.push({
            index: startIndex,
            path: []
        });
        visited.add(startIndex);

        // Explore all possible paths using BFS
        while (queue.length > 0) {
            const { index, path: currentPath } = queue.shift()!;
            const currentRow = Math.floor(index / cols);
            const currentCol = index % cols;

            // Check all four directions (orthogonal neighbors)
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

            for (const [dr, dc] of directions) {
                const newRow = currentRow + dr;
                const newCol = currentCol + dc;
                const newIndex = toIndex(newRow, newCol, cols);

                // Check if valid and walkable (empty)
                if (
                    newRow >= 0 &&
                    newRow < layoutData.length &&
                    newCol >= 0 &&
                    newCol < layoutData[0].length &&
                    isWalkable(newRow, newCol) &&
                    !visited.has(newIndex)
                ) {
                    // Create a new path with this step
                    const newPath = [...currentPath, [newRow, newCol]];

                    // If we reached the destination
                    if (newIndex === endIndex) {
                        return newPath;
                    }

                    // Otherwise continue BFS
                    visited.add(newIndex);
                    queue.push({ index: newIndex, path: newPath });
                }
            }
        }

        // If no path found through walkable squares, return empty path
        console.error(`No walkable path found from (${startRow}, ${startCol}) to (${endRow}, ${endCol})`);
        return [];
    };

    /**
     * Remove duplicate consecutive points from a path
     */
    const removeDuplicates = (path: number[][]) => {
        return path.filter((point, index, array) => {
            // Keep the point if it's the first one or different from the previous one
            return index === 0 ||
                point[0] !== array[index - 1][0] ||
                point[1] !== array[index - 1][1];
        });
    };

    /**
     * Validate the generated path to ensure all points are walkable
     */
    const validatePath = (path: number[][]) => {
        // Find any non-walkable points in the path
        const invalidPoints = path.filter(point => {
            const [row, col] = point;
            return !isWalkable(row, col);
        });

        if (invalidPoints.length > 0) {
            console.error("WARNING: Path contains non-walkable squares:", invalidPoints);
            // Filter out non-walkable squares
            return path.filter(point => {
                const [row, col] = point;
                return isWalkable(row, col);
            });
        }

        return path;
    };

    /**
     * Main function to generate an optimized path
     */
    /**
     * Main function to generate an optimized path
     */
    const generateOptimizedPath = () => {
        if (layoutData.length === 0 || selectedProducts.length === 0) {
            return;
        }

        // If we have precomputed path data, use it for optimal routing
        if (optimizedPathData?.dist && optimizedPathData?.next) {
            console.log("Using precomputed path data for optimization");
            const cols = layoutData[0].length;

            // Step 1: Find key locations (entrance, cash register, exit)
            const { entranceCoord, cashRegisterCoord, exitCoord } = findKeyLocations();

            if (!entranceCoord) {
                console.error("No entrance found in layout");
                return;
            }

            const finalDestination = cashRegisterCoord || exitCoord;
            if (!finalDestination) {
                console.warn("No cash register or exit found");
            }

            // Step 2: Find product squares that contain selected products
            const productSquares = findProductSquares();

            // If no product squares found, create a simple path
            if (productSquares.length === 0) {
                console.warn("No product squares found for selected products");
                const simplePath: number[][] = [];

                // Add walkable squares adjacent to entrance
                const entranceAdjacentSquares = findAdjacentWalkableSquares(entranceCoord.row, entranceCoord.col);
                if (entranceAdjacentSquares.length > 0) {
                    simplePath.push([entranceAdjacentSquares[0].row, entranceAdjacentSquares[0].col]);
                }

                // Add walkable squares adjacent to final destination
                if (finalDestination) {
                    const destAdjacentSquares = findAdjacentWalkableSquares(finalDestination.row, finalDestination.col);
                    if (destAdjacentSquares.length > 0) {
                        simplePath.push([destAdjacentSquares[0].row, destAdjacentSquares[0].col]);
                    }
                }

                setOptimizedPath(simplePath);

                // Set entrance and exit as special stops
                const specialStops: ProductStop[] = [
                    {
                        position: [entranceCoord.row, entranceCoord.col],
                        stopNumber: 1,
                        products: []
                    }
                ];

                if (finalDestination) {
                    specialStops.push({
                        position: [finalDestination.row, finalDestination.col],
                        stopNumber: 2,
                        products: []
                    });
                }

                setProductStops(specialStops);
                setShowOptimizedPath(true);
                return;
            }

            // Step 3: Find walkable access points for each product square
            const accessPoints = findProductAccessPoints(productSquares);

            // Step 4: Select the best access point for each product square
            // For entrance and exit, find adjacent walkable squares
            const entranceAccessPoints = findAdjacentWalkableSquares(entranceCoord.row, entranceCoord.col);
            const entranceAccessPoint = entranceAccessPoints.length > 0 ? entranceAccessPoints[0] : null;

            let destinationAccessPoint = null;
            if (finalDestination) {
                const destAccessPoints = findAdjacentWalkableSquares(finalDestination.row, finalDestination.col);
                destinationAccessPoint = destAccessPoints.length > 0 ? destAccessPoints[0] : null;
            }

            const bestAccessPoints = selectBestAccessPoints(accessPoints, entranceAccessPoint || entranceCoord);

            // Step 5: Convert to format needed by TSP
            const accessPointCoords = bestAccessPoints.map(point => ({
                row: point.walkableRow,
                col: point.walkableCol
            }));

            // Step 6: Use TSP to find optimal order to visit the access points
            console.log("Finding optimal visit order with TSP algorithm");
            const optimalAccessOrder = tspHeldKarp(
                accessPointCoords,
                optimizedPathData.dist,
                cols,
                entranceAccessPoint || entranceCoord
            );

            // Step 7: Map the access points back to their product squares
            const optimalProductOrder: {
                productIndex: number;
                accessPointIndex: number;
                stopNumber: number;
            }[] = [];

            for (let i = 0; i < optimalAccessOrder.length; i++) {
                const accessPoint = optimalAccessOrder[i];
                const accessIdx = toIndex(accessPoint.row, accessPoint.col, cols);

                for (const bestPoint of bestAccessPoints) {
                    if (bestPoint.walkableIndex === accessIdx) {
                        optimalProductOrder.push({
                            productIndex: bestPoint.productIndex,
                            accessPointIndex: accessIdx,
                            stopNumber: i + 2 // Start counting from 2 (entrance is 1)
                        });
                        break;
                    }
                }
            }

            // Step 8: Generate a path through walkable squares only
            const walkablePath: number[][] = [];

            // Start with a walkable square adjacent to entrance
            if (entranceAccessPoint) {
                walkablePath.push([entranceAccessPoint.row, entranceAccessPoint.col]);
            }

            let lastPosition = entranceAccessPoint || entranceCoord;

            // Generate paths between access points
            for (const accessPoint of optimalAccessOrder) {
                if (lastPosition) {
                    const pathSegment = generatePathBetweenPoints(
                        lastPosition.row,
                        lastPosition.col,
                        accessPoint.row,
                        accessPoint.col,
                        cols
                    );

                    // Add path segment to the full path (avoid duplicates)
                    if (pathSegment.length > 0) {
                        walkablePath.push(...pathSegment);
                    }
                }

                lastPosition = { row: accessPoint.row, col: accessPoint.col };
            }

            // Add path to final destination access point if available
            if (destinationAccessPoint && lastPosition) {
                const pathToDestination = generatePathBetweenPoints(
                    lastPosition.row,
                    lastPosition.col,
                    destinationAccessPoint.row,
                    destinationAccessPoint.col,
                    cols
                );

                if (pathToDestination.length > 0) {
                    walkablePath.push(...pathToDestination);
                }
            }

            // Inside the generateOptimizedPath function in ShoppingList.tsx
            // Step 9: Create product stops for visualization including entrance and exit
            const stops: ProductStop[] = [
                // First stop is always the entrance with a special label
                {
                    position: [entranceCoord.row, entranceCoord.col],
                    stopNumber: 0, // Use 0 or another special value to indicate "Start"
                    products: [],
                    isSpecial: true,  // Add a flag to indicate this is a special stop
                    label: "Start"    // Add a custom label
                }
            ];

            // Add product stops with sequential numbers starting from 1
            optimalProductOrder.forEach((stop, index) => {
                // Find the original product square coordinates
                const productRow = Math.floor(stop.productIndex / cols);
                const productCol = stop.productIndex % cols;

                // Find which product square this is
                const productSquare = productSquares.find(p => p.index === stop.productIndex);

                stops.push({
                    position: [productRow, productCol] as [number, number],
                    stopNumber: index + 1, // Start product numbering from 1
                    products: productSquare?.products || []
                });
            });

            // Add final destination as last stop if available
            if (finalDestination) {
                stops.push({
                    position: [finalDestination.row, finalDestination.col],
                    stopNumber: 0, // Use 0 or another special value to indicate "Finish"
                    products: [],
                    isSpecial: true,  // Flag to indicate special stop
                    label: "Finish"   // Custom label
                });
            }

            // Step 10: Remove duplicates and validate the path
            const deduplicatedPath = removeDuplicates(walkablePath);
            const validatedPath = validatePath(deduplicatedPath);

            setOptimizedPath(validatedPath);
            setProductStops(stops);
            setShowOptimizedPath(true);
            console.log("Generated optimized path with", validatedPath.length, "steps and", stops.length, "stops");
        } else {
            // Fallback for when path data isn't available
            generateSimplePath();
        }
    };

    /**
     * Find walkable squares adjacent to a given position
     */
    const findAdjacentWalkableSquares = (row: number, col: number) => {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const adjacentSquares: { row: number; col: number; }[] = [];

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
        const productLocations: { position: [number, number], products: string[] }[] = [];
        for (let i = 0; i < layoutData.length; i++) {
            for (let j = 0; j < layoutData[i].length; j++) {
                const square = layoutData[i][j];
                if (square.type === "products") {
                    const matchingProducts = square.productIds.filter(id =>
                        selectedProducts.includes(id)
                    );

                    if (matchingProducts.length > 0) {
                        productLocations.push({
                            position: [i, j],
                            products: matchingProducts
                        });
                    }
                }
            }
        }

        // Simple path from entrance to final destination
        const simplePath: number[][] = [
            [entranceCoord.row, entranceCoord.col]
        ];

        // Add final destination if available
        if (finalDestination) {
            simplePath.push([finalDestination.row, finalDestination.col]);
        }

        // Create numbered product stops
        const simpleStops = productLocations.map((location, index) => ({
            position: location.position,
            stopNumber: index + 1,
            products: location.products
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
            )
        },
        {
            title: "listManager",
            data: ["listManager"],
            renderItem: () => (
                supermarketId ? (
                    <ShoppingListManager
                        supermarketId={supermarketId}
                        selectedProducts={selectedProducts}
                        onShoppingListLoaded={handleShoppingListLoaded}
                        currentUser={currentUser || undefined}
                    />
                ) : null
            )
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
            )
        },
        {
            title: "products",
            data: ["products"],
            renderItem: () => (
                <ProductsSection
                    products={products}
                    selectedProducts={selectedProducts}
                    onProductSelect={toggleProductSelection}
                />
            )
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
                />
            )
        }
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
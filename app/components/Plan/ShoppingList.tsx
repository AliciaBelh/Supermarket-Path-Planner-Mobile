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
import { tspHeldKarp } from "../../utils/held_karp_tsp_optimal"

// Helper function to convert 2D coordinates to 1D index
const toIndex = (row: number, col: number, cols: number): number => row * cols + col;

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

    // Generate an optimized path using precomputed pathData and TSP Held-Karp
    const generateOptimizedPath = () => {
        if (layoutData.length === 0 || selectedProducts.length === 0) {
            return;
        }

        // If we have precomputed path data, use it for optimal routing
        if (optimizedPathData && optimizedPathData.dist && optimizedPathData.next) {
            console.log("Using precomputed path data for optimization");

            const cols = layoutData[0].length;

            // Find entrance and cash register
            let entranceCoord: { row: number; col: number } | undefined;
            let cashRegisterCoord: { row: number; col: number } | undefined;

            // Find product locations
            const productCoords: { row: number; col: number }[] = [];

            // Find all relevant locations
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    const square = layoutData[i][j];

                    // Track entrance (starting point)
                    if (square.type === "entrance") {
                        entranceCoord = { row: i, col: j };
                    }

                    // Track cash register (ending point)
                    if (square.type === "cash_register") {
                        cashRegisterCoord = { row: i, col: j };
                    }

                    // Find product locations that match our selected products
                    if (square.type === "products" &&
                        square.productIds.some(id => selectedProducts.includes(id))) {
                        productCoords.push({ row: i, col: j });
                    }
                }
            }

            if (!entranceCoord) {
                console.error("No entrance found in layout");
                return;
            }

            if (!cashRegisterCoord) {
                console.warn("No cash register found in layout, using exit as final destination");
                // Try to find exit as alternative
                for (let i = 0; i < layoutData.length; i++) {
                    for (let j = 0; j < layoutData[i].length; j++) {
                        if (layoutData[i][j].type === "exit") {
                            cashRegisterCoord = { row: i, col: j };
                            break;
                        }
                    }
                    if (cashRegisterCoord) break;
                }
            }

            // If we found no product squares matching selected products
            if (productCoords.length === 0) {
                console.warn("No product squares found for selected products");
                // Create a simple path from entrance to cash register
                const pathCoordinates: number[][] = [];

                if (entranceCoord) {
                    pathCoordinates.push([entranceCoord.row, entranceCoord.col]);
                }

                if (cashRegisterCoord) {
                    pathCoordinates.push([cashRegisterCoord.row, cashRegisterCoord.col]);
                }

                setOptimizedPath(pathCoordinates);
                setShowOptimizedPath(true);
                return;
            }

            // Use Held-Karp to find the optimal order of products to visit
            console.log("Finding optimal product visit order with Held-Karp TSP algorithm");
            const optimalProductOrder = tspHeldKarp(
                productCoords,
                optimizedPathData.dist,
                cols,
                entranceCoord
            );

            console.log("Optimal product order found:", optimalProductOrder);

            // Reconstruct the full path using the Floyd-Warshall next matrix
            const fullPath: number[][] = [];

            // Start with entrance
            if (entranceCoord) {
                fullPath.push([entranceCoord.row, entranceCoord.col]);
            }

            // For each segment between points in our optimal order
            for (let i = 0; i < optimalProductOrder.length - 1; i++) {
                const from = optimalProductOrder[i];
                const to = optimalProductOrder[i + 1];

                const fromIndex = toIndex(from.row, from.col, cols);
                const toSquareIndex = toIndex(to.row, to.col, cols);

                // Get the detailed path between these two points using the next matrix
                let currentIndex = fromIndex;

                while (currentIndex !== toSquareIndex) {
                    // Get the next step in the path
                    const nextIndex = optimizedPathData.next[currentIndex][toSquareIndex];

                    // If no path exists
                    if (nextIndex === -1 || nextIndex === undefined) {
                        console.error(`No path found from ${currentIndex} to ${toIndex}`);
                        break;
                    }

                    // Convert index back to coordinates
                    const nextRow = Math.floor(nextIndex / cols);
                    const nextCol = nextIndex % cols;

                    // Add to our path
                    fullPath.push([nextRow, nextCol]);

                    // Move to next step
                    currentIndex = nextIndex;
                }
            }

            // Add path to cash register if found
            if (cashRegisterCoord) {
                const lastProductIndex = toIndex(
                    optimalProductOrder[optimalProductOrder.length - 1].row,
                    optimalProductOrder[optimalProductOrder.length - 1].col,
                    cols
                );
                const cashRegisterIndex = toIndex(cashRegisterCoord.row, cashRegisterCoord.col, cols);

                let currentIndex = lastProductIndex;

                while (currentIndex !== cashRegisterIndex) {
                    // Get the next step in the path
                    const nextIndex = optimizedPathData.next[currentIndex][cashRegisterIndex];

                    // If no path exists
                    if (nextIndex === -1 || nextIndex === undefined) {
                        console.error(`No path found from last product to cash register`);
                        break;
                    }

                    // Convert index back to coordinates
                    const nextRow = Math.floor(nextIndex / cols);
                    const nextCol = nextIndex % cols;

                    // Add to our path
                    fullPath.push([nextRow, nextCol]);

                    // Move to next step
                    currentIndex = nextIndex;
                }
            }

            setOptimizedPath(fullPath);
            setShowOptimizedPath(true);
            console.log("Generated optimized path with", fullPath.length, "steps");
        } else {
            // Fall back to the existing simple path generation
            console.log("No precomputed path data available, using simple path");

            // Find entrance (starting point)
            let start: [number, number] | null = null;
            let cashRegister: [number, number] | null = null;

            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    if (layoutData[i][j].type === "entrance") {
                        start = [i, j];
                    }
                    if (layoutData[i][j].type === "cash_register") {
                        cashRegister = [i, j];
                    }
                }
            }

            if (!start) {
                console.error("No entrance found in layout");
                return;
            }

            // Find product locations
            const productLocations: [number, number][] = [];
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    if (layoutData[i][j].type === "products" &&
                        layoutData[i][j].productIds.some(id => selectedProducts.includes(id))) {
                        productLocations.push([i, j]);
                    }
                }
            }

            // Simple path: from entrance to each product in the order they appear
            const simplePath: number[][] = [start, ...productLocations];

            // Add cash register as the final destination if found
            if (cashRegister) {
                simplePath.push(cashRegister);
            } else {
                // Find exit as alternative
                for (let i = 0; i < layoutData.length; i++) {
                    for (let j = 0; j < layoutData[i].length; j++) {
                        if (layoutData[i][j].type === "exit") {
                            simplePath.push([i, j]);
                            break;
                        }
                    }
                }
            }

            setOptimizedPath(simplePath);
            setShowOptimizedPath(true);
        }
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
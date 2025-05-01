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

            const supermarketResponse = await client.models.Supermarket.get({
                id: supermarketId,
            });

            // console.log("Supermarket Response Full:", JSON.stringify(supermarketResponse, null, 2));

            if (supermarketResponse.data) {
                setSupermarket(supermarketResponse.data);
                console.log(supermarketResponse.data)

                // Fetch products for this supermarket
                const productsResponse = await client.models.Product.list({
                    filter: { supermarketID: { eq: supermarketId } }
                });

                // console.log("Products Response Full:", JSON.stringify(productsResponse, null, 2));

                if (productsResponse.data && productsResponse.data.length > 0) {
                    console.log("Products Count:", productsResponse.data.length);
                    // console.log("Product Details:", JSON.stringify(productsResponse.data, null, 2));
                    setProducts(productsResponse.data);
                } else {
                    console.warn("No products found for this supermarket");
                    setProducts([]);
                }

                // Parse the layout
                if (supermarketResponse.data.layout) {
                    try {
                        const layoutJson = JSON.parse(supermarketResponse.data.layout);
                        // console.log("Parsed Layout:", JSON.stringify(layoutJson, null, 2));
                        setLayoutData(layoutJson);
                    } catch (parseError) {
                        console.error("Error parsing layout:", parseError);
                        setLayoutData([]);
                    }
                }

                // Parse the pathData if available
                if (supermarketResponse.data.pathData) {
                    try {
                        const pathDataJson = JSON.parse(supermarketResponse.data.pathData);
                        console.log("Found path data in supermarket:", pathDataJson.metadata?.timestamp || "unknown timestamp");

                        // Store the path data for later use in generateOptimizedPath
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

    // Generate an optimized path using precomputed pathData if available
    const generateOptimizedPath = () => {
        if (layoutData.length === 0 || selectedProducts.length === 0) {
            return;
        }

        // If we have precomputed path data, use it for optimal routing
        if (optimizedPathData && optimizedPathData.dist && optimizedPathData.next) {
            // Find entrance (starting point)
            let startIndex: number | null = null;

            // Find product locations
            const productIndices: number[] = [];
            const cols = layoutData[0].length;

            // Map 2D coordinates to 1D indices for using with the path data
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    const squareIndex = i * cols + j;

                    // Find entrance
                    if (layoutData[i][j].type === "entrance") {
                        startIndex = squareIndex;
                    }

                    // Find product locations that match our selected products
                    if (layoutData[i][j].type === "products" &&
                        layoutData[i][j].productIds.some(id => selectedProducts.includes(id))) {
                        productIndices.push(squareIndex);
                    }
                }
            }

            if (startIndex === null) {
                console.error("No entrance found in layout");
                return;
            }

            // Use the Floyd-Warshall next matrix to reconstruct the optimal path
            // This is a traveling salesman problem approximation using a greedy approach
            let currentIndex = startIndex;
            const path: number[] = [currentIndex];

            // Visit each product location in order of closest next destination
            while (productIndices.length > 0) {
                // Find closest unvisited product location
                let closestIndex = -1;
                let shortestDist = Infinity;

                for (let i = 0; i < productIndices.length; i++) {
                    const dist = optimizedPathData.dist[currentIndex][productIndices[i]];
                    if (dist < shortestDist) {
                        shortestDist = dist;
                        closestIndex = i;
                    }
                }

                if (closestIndex === -1) break; // No reachable products left

                // Get the next destination
                const nextIndex = productIndices[closestIndex];
                productIndices.splice(closestIndex, 1); // Remove from unvisited

                // Reconstruct path from current to next using the Floyd-Warshall next matrix
                let step = currentIndex;
                while (step !== nextIndex) {
                    step = optimizedPathData.next[step][nextIndex];
                    if (step === -1) break; // No path found
                    path.push(step);
                }

                currentIndex = nextIndex;
            }

            // Find exit (ending point)
            let exitIndex: number | null = null;
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    if (layoutData[i][j].type === "exit") {
                        exitIndex = i * cols + j;
                        break;
                    }
                }
                if (exitIndex !== null) break;
            }

            // Add path to exit if found
            if (exitIndex !== null) {
                let step = currentIndex;
                while (step !== exitIndex) {
                    step = optimizedPathData.next[step][exitIndex];
                    if (step === -1) break; // No path found
                    path.push(step);
                }
            }

            // Convert 1D indices back to 2D coordinates for display
            const pathCoordinates = path.map(index => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                return [row, col];
            });

            setOptimizedPath(pathCoordinates);
            setShowOptimizedPath(true);
            console.log("Generated optimized path using precomputed path data");
        } else {
            // Fall back to the existing simple path generation
            console.log("No precomputed path data available, using simple path");

            // Find entrance (starting point)
            let start: [number, number] | null = null;
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    if (layoutData[i][j].type === "entrance") {
                        start = [i, j];
                        break;
                    }
                }
                if (start) break;
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

            // Find exit (ending point)
            for (let i = 0; i < layoutData.length; i++) {
                for (let j = 0; j < layoutData[i].length; j++) {
                    if (layoutData[i][j].type === "exit") {
                        simplePath.push([i, j]);
                        break;
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
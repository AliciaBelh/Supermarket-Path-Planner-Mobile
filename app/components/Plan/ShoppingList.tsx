// ShoppingList.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    SectionList,
    SafeAreaView,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, Product, Square, ShoppingListProps, AmplifyClient } from "../../../types";
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

            // Make sure supermarketId is defined before passing it
            if (!supermarketId) {
                setError("No supermarket selected");
                setLoading(false);
                return;
            }

            const supermarketResponse = await client.models.Supermarket.get({
                id: supermarketId,
            });

            if (!supermarketResponse.data) {
                throw new Error("Supermarket not found");
            }

            setSupermarket(supermarketResponse.data);

            // Fetch products
            const productsResponse = await client.models.Product.list({
                filter: { supermarketID: { eq: supermarketId } }
            });

            if (productsResponse.data) {
                setProducts(productsResponse.data);
            }

            // Parse the layout JSON string if it exists
            if (supermarketResponse.data.layout) {
                try {
                    const layoutJson = JSON.parse(supermarketResponse.data.layout);
                    setLayoutData(layoutJson);
                } catch (parseError) {
                    console.error("Error parsing layout:", parseError);
                    setLayoutData([]);
                }
            }

        } catch (err) {
            console.error("Error fetching supermarket data:", err);
            setError("Failed to load supermarket data. Please try again.");
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

    // Generate an optimized path (placeholder function)
    const generateOptimizedPath = () => {
        // This is a placeholder. In a real implementation, you would:
        // 1. Find locations of selected products in the layout
        // 2. Use a pathfinding algorithm to determine the optimal route
        // 3. Return the path as a series of coordinates

        // Example placeholder implementation:
        if (layoutData.length === 0 || selectedProducts.length === 0) {
            return;
        }

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
        <SafeAreaView style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item + index}
                renderSectionHeader={() => null}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.sectionListContent}
            />
        </SafeAreaView>
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
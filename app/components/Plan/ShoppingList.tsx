// ShoppingList.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, Product, Square, ShoppingListProps, AmplifyClient } from "../../../types";
import { useLocalSearchParams } from "expo-router";

// Import our separated components
import ProductsSection from "./ProductsSection";
import StoreLayoutSection from "./StoreLayoutSection";

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

    const client = generateClient() as unknown as AmplifyClient;

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

            // For the example, let's assume we would also fetch products here
            // and set them in the products state
            // This is where you would make the actual API call to fetch products

            // For now, let's assume products are fetched here
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

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
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

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>{supermarket?.name} Shopping List</Text>
                {selectedProducts.length > 0 && (
                    <Text style={styles.subheader}>
                        {selectedProducts.length} item
                        {selectedProducts.length !== 1 ? "s" : ""} selected
                    </Text>
                )}
            </View>

            <View style={styles.mainContent}>
                {/* Products section first */}
                <ProductsSection
                    products={products}
                    selectedProducts={selectedProducts}
                    onProductSelect={toggleProductSelection}
                />

                {/* Layout section second */}
                <StoreLayoutSection
                    layoutData={layoutData}
                    selectedProducts={selectedProducts}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
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
        backgroundColor: "#2196F3",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    retryButtonText: {
        color: "white",
        fontWeight: "bold",
    },
});

export default ShoppingList;
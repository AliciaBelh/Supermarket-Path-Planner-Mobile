import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Alert,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, Product, Square, ShoppingListProps, AmplifyClient } from "../types";
import { useLocalSearchParams } from "expo-router";



// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust as needed

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

            // Rest of your function remains the same...
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

    // Get the square color based on its type
    const getSquareColor = (square: Square) => {
        // Show the regular color based on type
        switch (square.type) {
            case "products":
                return "#4CAF50"; // green
            case "cash_register":
                return "#FFC107"; // yellow
            case "entrance":
                return "#2196F3"; // blue
            case "exit":
                return "#F44336"; // red
            default:
                return "#E0E0E0"; // light grey for empty
        }
    };

    // Render a square in the layout
    const renderSquare = (square: Square, rowIndex: number, colIndex: number) => {
        // Check if this square contains one of our selected products
        const isSelectedProductSquare =
            square.type === "products" &&
            square.productIds.some((id) => selectedProducts.includes(id));

        return (
            <View
                key={`${rowIndex}-${colIndex}`}
                style={[
                    styles.square,
                    {
                        backgroundColor: getSquareColor(square),
                        width: SQUARE_SIZE,
                        height: SQUARE_SIZE,
                        // Add a border for selected product squares
                        borderWidth: isSelectedProductSquare ? 2 : 0.5,
                        borderColor: isSelectedProductSquare ? "#FF6D00" : "#999",
                    },
                ]}
            />
        );
    };

    // Render the layout
    const renderLayout = () => {
        return (
            <View style={styles.layoutContainer}>
                {layoutData.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((square, colIndex) =>
                            renderSquare(square, rowIndex, colIndex)
                        )}
                    </View>
                ))}
            </View>
        );
    };

    // Render a product item
    const renderProductItem = ({ item }: { item: Product }) => {
        const isSelected = selectedProducts.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.productItem, isSelected && styles.selectedProductItem]}
                onPress={() => toggleProductSelection(item.id)}
            >
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                {item.category && (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                )}
                {isSelected && (
                    <View style={styles.selectedBadge}>
                        <Text style={styles.selectedText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
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
                <View style={styles.layoutSection}>
                    <Text style={styles.sectionTitle}>Store Layout</Text>
                    <ScrollView
                        horizontal
                        contentContainerStyle={styles.layoutScrollContent}
                    >
                        <ScrollView horizontal>
                            <ScrollView>{renderLayout()}</ScrollView>
                        </ScrollView>
                    </ScrollView>

                    <View style={styles.legendContainer}>
                        <Text style={styles.legendTitle}>Legend:</Text>
                        <View style={styles.legendContent}>
                            <View style={styles.legendRow}>
                                <View
                                    style={[styles.legendSquare, { backgroundColor: "#E0E0E0" }]}
                                />
                                <Text style={styles.legendText}>Empty</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View
                                    style={[styles.legendSquare, { backgroundColor: "#4CAF50" }]}
                                />
                                <Text style={styles.legendText}>Products</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View
                                    style={[styles.legendSquare, { backgroundColor: "#FFC107" }]}
                                />
                                <Text style={styles.legendText}>Cash Register</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View
                                    style={[styles.legendSquare, { backgroundColor: "#2196F3" }]}
                                />
                                <Text style={styles.legendText}>Entrance</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View
                                    style={[styles.legendSquare, { backgroundColor: "#F44336" }]}
                                />
                                <Text style={styles.legendText}>Exit</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.productsSection}>
                    <Text style={styles.sectionTitle}>Products</Text>
                    {products.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No products available in this supermarket
                        </Text>
                    ) : (
                        <FlatList
                            data={products}
                            renderItem={renderProductItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.productsList}
                        />
                    )}
                </View>
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
    layoutSection: {
        marginBottom: 16,
        backgroundColor: "white",
        borderRadius: 8,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#333",
    },
    layoutScrollContent: {
        padding: 8,
    },
    layoutContainer: {
        backgroundColor: "white",
        borderRadius: 8,
    },
    row: {
        flexDirection: "row",
    },
    square: {
        borderWidth: 0.5,
        borderColor: "#999",
    },
    legendContainer: {
        marginTop: 12,
        padding: 8,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
    },
    legendContent: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 4,
        width: "33%",
    },
    legendSquare: {
        width: 16,
        height: 16,
        borderWidth: 0.5,
        borderColor: "#999",
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        color: "#333",
    },
    productsSection: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 8,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    productsList: {
        paddingVertical: 8,
    },
    productItem: {
        backgroundColor: "white",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        position: "relative",
    },
    selectedProductItem: {
        borderColor: "#4CAF50",
        backgroundColor: "#F1F8E9",
    },
    productTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        paddingRight: 24, // Make room for the selected badge
    },
    productPrice: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
    },
    categoryBadge: {
        backgroundColor: "#e0e0e0",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginTop: 8,
    },
    categoryText: {
        fontSize: 12,
        color: "#666",
    },
    selectedBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#4CAF50",
        justifyContent: "center",
        alignItems: "center",
    },
    selectedText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
    },
    emptyText: {
        textAlign: "center",
        color: "#666",
        marginTop: 20,
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
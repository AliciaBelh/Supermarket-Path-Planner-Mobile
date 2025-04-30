// ProductsSection.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "../../../types";

interface ProductsSectionProps {
    products: Product[];
    selectedProducts: string[];
    onProductSelect: (productId: string) => void;
}

const PRODUCTS_PER_PAGE = 5; // Number of products to show per page

const ProductsSection = ({
    products,
    selectedProducts,
    onProductSelect,
}: ProductsSectionProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter products when search query changes or products update
    useEffect(() => {
        if (products.length > 0) {
            const filtered = products.filter(
                (product) =>
                    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    product.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredProducts(filtered);
            setCurrentPage(1); // Reset to first page when search changes
        }
    }, [searchQuery, products]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(
        startIndex,
        startIndex + PRODUCTS_PER_PAGE
    );

    // Go to next page
    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    // Go to previous page
    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery("");
    };

    // Render a product item
    const renderProductItem = ({ item }: { item: Product }) => {
        const isSelected = selectedProducts.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.productItem, isSelected && styles.selectedProductItem]}
                onPress={() => onProductSelect(item.id)}
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

    return (
        <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>Products</Text>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <Ionicons
                    name="search"
                    size={20}
                    color="#757575"
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products by name or category..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={18} color="#757575" />
                    </TouchableOpacity>
                )}
            </View>

            {filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="basket-outline" size={48} color="#BDBDBD" />
                    <Text style={styles.emptyText}>
                        {searchQuery
                            ? "No products match your search"
                            : "No products available in this supermarket"}
                    </Text>
                    {searchQuery && (
                        <TouchableOpacity
                            style={styles.clearSearchButton}
                            onPress={clearSearch}
                        >
                            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <>
                    <View style={styles.productsListContainer}>
                        <FlatList
                            data={paginatedProducts}
                            renderItem={renderProductItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.productsList}
                            scrollEnabled={false} // Important: Disable scrolling in the inner FlatList
                        />
                    </View>

                    {/* Pagination controls */}
                    <View style={styles.paginationContainer}>
                        <TouchableOpacity
                            style={[
                                styles.paginationButton,
                                currentPage === 1 && styles.paginationButtonDisabled,
                            ]}
                            onPress={prevPage}
                            disabled={currentPage === 1}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={18}
                                color={currentPage === 1 ? "#BDBDBD" : "#333"}
                            />
                            <Text
                                style={[
                                    styles.paginationButtonText,
                                    currentPage === 1 && styles.paginationButtonTextDisabled,
                                ]}
                            >
                                Previous
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.paginationInfo}>
                            Page {currentPage} of {totalPages || 1}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.paginationButton,
                                currentPage >= totalPages && styles.paginationButtonDisabled,
                            ]}
                            onPress={nextPage}
                            disabled={currentPage >= totalPages}
                        >
                            <Text
                                style={[
                                    styles.paginationButtonText,
                                    currentPage >= totalPages && styles.paginationButtonTextDisabled,
                                ]}
                            >
                                Next
                            </Text>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={currentPage >= totalPages ? "#BDBDBD" : "#333"}
                            />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    productsSection: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    // Search styles
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
        height: 46,
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 46,
        fontSize: 16,
        color: "#333",
    },
    clearButton: {
        padding: 4,
    },
    clearSearchButton: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#EEEEEE",
        borderRadius: 4,
    },
    clearSearchButtonText: {
        color: "#757575",
        fontWeight: "500",
    },
    // Pagination styles
    paginationContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEEEEE",
        marginTop: 8,
    },
    paginationButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: "#F5F5F5",
    },
    paginationButtonDisabled: {
        backgroundColor: "#F9F9F9",
    },
    paginationButtonText: {
        color: "#333",
        fontWeight: "500",
        fontSize: 14,
    },
    paginationButtonTextDisabled: {
        color: "#BDBDBD",
    },
    paginationInfo: {
        fontSize: 14,
        color: "#757575",
    },
    // Empty state
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: "#757575",
        textAlign: "center",
    },
    productsListContainer: {
        // Set a fixed height to prevent FlatList from expanding
        // This avoids the need for the FlatList to be scrollable
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
});

export default ProductsSection;
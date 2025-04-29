// StoreLayoutSection.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
} from "react-native";
import { Square } from "../../../types";

interface StoreLayoutSectionProps {
    layoutData: Square[][];
    selectedProducts: string[];
}

// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust as needed

const StoreLayoutSection = ({
    layoutData,
    selectedProducts,
}: StoreLayoutSectionProps) => {
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

    return (
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
    );
};

const styles = StyleSheet.create({
    layoutSection: {
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
        marginBottom: 12,
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
});

export default StoreLayoutSection;
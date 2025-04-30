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
import { Ionicons } from "@expo/vector-icons";

interface StoreLayoutSectionProps {
    layoutData: Square[][];
    selectedProducts: string[];
    optimizedPath?: number[][];
}

// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust as needed

const StoreLayoutSection = ({
    layoutData,
    selectedProducts,
    optimizedPath,
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

    // Check if a position is part of the path
    const isPartOfPath = (row: number, col: number): boolean => {
        if (!optimizedPath) return false;
        return optimizedPath.some(pos => pos[0] === row && pos[1] === col);
    };

    // Get the position in the path (for numbering)
    const getPathPosition = (row: number, col: number): number => {
        if (!optimizedPath) return -1;
        return optimizedPath.findIndex(pos => pos[0] === row && pos[1] === col);
    };

    // Render a square in the layout
    const renderSquare = (square: Square, rowIndex: number, colIndex: number) => {
        // Check if this square contains one of our selected products
        const isSelectedProductSquare =
            square.type === "products" &&
            square.productIds.some((id) => selectedProducts.includes(id));

        // Check if this square is part of the optimized path
        const pathPos = getPathPosition(rowIndex, colIndex);
        const onPath = pathPos !== -1;

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
            >
                {onPath && (
                    <View style={styles.pathMarker}>
                        <Text style={styles.pathMarkerText}>{pathPos + 1}</Text>
                    </View>
                )}
            </View>
        );
    };

    // Draw a line between consecutive path points
    const renderPathLines = () => {
        if (!optimizedPath || optimizedPath.length < 2) return null;

        return optimizedPath.map((point, index) => {
            if (index === optimizedPath.length - 1) return null; // Skip the last point

            const start = point;
            const end = optimizedPath[index + 1];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            return (
                <View
                    key={`line-${index}`}
                    style={[
                        styles.pathLine,
                        {
                            width: length,
                            left: startX,
                            top: startY,
                            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
                        },
                    ]}
                />
            );
        });
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

                {/* Draw path lines between points */}
                {optimizedPath && optimizedPath.length > 0 && renderPathLines()}
            </View>
        );
    };

    return (
        <View style={styles.layoutSection}>
            <Text style={styles.sectionTitle}>Store Layout</Text>

            {optimizedPath && optimizedPath.length > 0 && (
                <View style={styles.pathInfoContainer}>
                    <Ionicons name="map" size={20} color="#2E7D32" />
                    <Text style={styles.pathInfoText}>
                        Optimized path generated with {optimizedPath.length} stops
                    </Text>
                </View>
            )}

            <View style={styles.outerScrollContainer}>
                <ScrollView horizontal>
                    {renderLayout()}
                </ScrollView>
            </View>

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
                    {optimizedPath && optimizedPath.length > 0 && (
                        <View style={styles.legendRow}>
                            <View style={styles.legendPathMarker}>
                                <Text style={styles.legendPathMarkerText}>1</Text>
                            </View>
                            <Text style={styles.legendText}>Path Stop</Text>
                        </View>
                    )}
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
    pathInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        padding: 10,
        borderRadius: 6,
        marginBottom: 12,
    },
    pathInfoText: {
        marginLeft: 8,
        fontSize: 14,
        color: "#2E7D32",
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    outerScrollContainer: {
        maxHeight: 300, // Set a maximum height to prevent it from taking too much space
    },
    layoutScrollContainer: {
        padding: 8,
    },
    layoutContainer: {
        backgroundColor: "white",
        borderRadius: 8,
        position: "relative", // For positioning path lines
        padding: 8,
    },
    row: {
        flexDirection: "row",
    },
    square: {
        borderWidth: 0.5,
        borderColor: "#999",
        justifyContent: "center",
        alignItems: "center",
    },
    pathMarker: {
        width: SQUARE_SIZE * 0.65,
        height: SQUARE_SIZE * 0.65,
        borderRadius: SQUARE_SIZE * 0.325,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    pathMarkerText: {
        color: "white",
        fontSize: SQUARE_SIZE * 0.4,
        fontWeight: "bold",
    },
    pathLine: {
        height: 2,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        position: "absolute",
        transformOrigin: "left",
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
    legendPathMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    legendPathMarkerText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    legendText: {
        fontSize: 12,
        color: "#333",
    },
});

export default StoreLayoutSection;
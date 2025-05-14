// StoreLayoutSection.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { Square, Product } from "../../../types";
import { Ionicons } from "@expo/vector-icons";
import StopProductsModal from "../StopProductsModal";

interface ProductStop {
    position: [number, number]; // Coordinates of the product square
    stopNumber: number;         // The stop number (1, 2, 3, etc.)
    products: string[];         // Product IDs in this square
    isSpecial?: boolean;        // Flag to indicate if this is a special stop
    label?: string;             // Label for special stops
}

interface StoreLayoutSectionProps {
    layoutData: Square[][];
    selectedProducts: string[];
    optimizedPath?: number[][];
    productStops?: ProductStop[];
    products: Product[];
}

// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust as needed

const StoreLayoutSection = ({
    layoutData,
    selectedProducts,
    optimizedPath,
    productStops,
    products,
}: StoreLayoutSectionProps) => {
    // State for product preview modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedStop, setSelectedStop] = useState<ProductStop | null>(null);
    const [stopProducts, setStopProducts] = useState<Product[]>([]);

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

    // Find if this position is a product stop
    const getProductStop = (row: number, col: number): ProductStop | undefined => {
        if (!productStops) return undefined;
        return productStops.find(stop => stop.position[0] === row && stop.position[1] === col);
    };

    // Function to handle tapping on a square
    const handleSquareTap = (square: Square, row: number, col: number) => {
        // Find if this is a product stop
        const productStop = getProductStop(row, col);

        if (productStop) {
            // Get the actual products for this stop
            const stopProductIds = productStop.products || [];
            const productsToShow = products.filter(product =>
                stopProductIds.includes(product.id)
            );

            setSelectedStop(productStop);
            setStopProducts(productsToShow);
            setModalVisible(true);
        }
    };

    // Find entrance and cash register coordinates
    const findKeyLocations = () => {
        let entranceCoord: { row: number; col: number } | null = null;
        let cashRegisterCoord: { row: number; col: number } | null = null;

        for (let i = 0; i < layoutData.length; i++) {
            for (let j = 0; j < layoutData[i].length; j++) {
                if (layoutData[i][j].type === "entrance") {
                    entranceCoord = { row: i, col: j };
                } else if (layoutData[i][j].type === "cash_register") {
                    cashRegisterCoord = { row: i, col: j };
                }
            }
        }

        return { entranceCoord, cashRegisterCoord };
    };

    const { entranceCoord, cashRegisterCoord } = findKeyLocations();

    // Render a square in the layout
    const renderSquare = (square: Square, rowIndex: number, colIndex: number) => {
        // Check if this square contains one of our selected products
        const isSelectedProductSquare =
            square.type === "products" &&
            square.productIds.some((id) => selectedProducts.includes(id));

        // Check if this is a product stop
        const productStop = getProductStop(rowIndex, colIndex);
        const isProductStop = !!productStop;

        // Determine if this is the entrance or cash register
        const isEntrance = square.type === "entrance";
        const isCashRegister = square.type === "cash_register";

        // Determine if we should show a stop marker
        const showStopMarker = isProductStop ||
            (isEntrance && productStops && productStops.length > 0) ||
            (isCashRegister && productStops && productStops.length > 0);

        // Determine the stop label and marker style
        let stopLabel: string | number = "";
        let markerStyle = {};

        if (isEntrance) {
            stopLabel = "Start";
            markerStyle = styles.startMarker;
        } else if (isCashRegister) {
            stopLabel = "Finish";
            markerStyle = styles.finishMarker;
        } else if (isProductStop) {
            if (productStop!.isSpecial && productStop!.label) {
                stopLabel = productStop!.label;
                if (productStop!.label === "Start") {
                    markerStyle = styles.startMarker;
                } else if (productStop!.label === "Finish") {
                    markerStyle = styles.finishMarker;
                }
            } else {
                stopLabel = productStop!.stopNumber;
            }
        }

        return (
            <TouchableOpacity
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
                onPress={() => handleSquareTap(square, rowIndex, colIndex)}
                activeOpacity={showStopMarker ? 0.7 : 1}
            >
                {/* If we should show a stop marker */}
                {showStopMarker && (
                    <View style={[styles.stopMarker, markerStyle]}>
                        <Text style={[
                            styles.stopMarkerText,
                            (isEntrance || isCashRegister) ? styles.specialStopText : null
                        ]}>
                            {stopLabel}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Draw a line between consecutive path points
    const renderPathLines = () => {
        if (!optimizedPath || optimizedPath.length < 1) return null;

        const lines = [];

        // Draw line from entrance to first path point
        if (entranceCoord && optimizedPath.length > 0) {
            const start = [entranceCoord.row, entranceCoord.col];
            const end = optimizedPath[0];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
                <View
                    key="line-entrance"
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
        }

        // Draw lines between path points
        for (let index = 0; index < optimizedPath.length - 1; index++) {
            const start = optimizedPath[index];
            const end = optimizedPath[index + 1];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
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
        }

        // Draw line from last path point to cash register
        if (cashRegisterCoord && optimizedPath.length > 0) {
            const start = optimizedPath[optimizedPath.length - 1];
            const end = [cashRegisterCoord.row, cashRegisterCoord.col];

            // Calculate line position and dimensions
            const startX = start[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const startY = start[0] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endX = end[1] * SQUARE_SIZE + SQUARE_SIZE / 2;
            const endY = end[0] * SQUARE_SIZE + SQUARE_SIZE / 2;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

            lines.push(
                <View
                    key="line-cash-register"
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
        }

        return lines;
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
                        Optimized path generated with {productStops ? productStops.filter(stop => !stop.isSpecial).length : 0} product stops
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

                    {productStops && productStops.length > 0 && (
                        <>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendStopMarker, styles.legendStartMarker]}>
                                    <Text style={styles.legendStopMarkerText}>S</Text>
                                </View>
                                <Text style={styles.legendText}>Start</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendStopMarker, styles.legendFinishMarker]}>
                                    <Text style={styles.legendStopMarkerText}>F</Text>
                                </View>
                                <Text style={styles.legendText}>Finish</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={styles.legendStopMarker}>
                                    <Text style={styles.legendStopMarkerText}>1</Text>
                                </View>
                                <Text style={styles.legendText}>Product Stop</Text>
                            </View>
                            <View style={styles.legendRow}>
                                <View style={[styles.legendPathLine]} />
                                <Text style={styles.legendText}>Path</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Products Modal */}
            <StopProductsModal
                visible={modalVisible}
                stopNumber={selectedStop?.isSpecial ? selectedStop.label || "" : selectedStop?.stopNumber || 0}
                products={stopProducts}
                onClose={() => setModalVisible(false)}
            />
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
    stopMarker: {
        width: SQUARE_SIZE * 0.65,
        height: SQUARE_SIZE * 0.65,
        borderRadius: SQUARE_SIZE * 0.325,
        backgroundColor: "rgba(255, 87, 34, 0.9)", // Orange marker for stops
        justifyContent: "center",
        alignItems: "center",
    },
    startMarker: {
        backgroundColor: "rgba(33, 150, 243, 0.9)",  // Blue for start
    },
    finishMarker: {
        backgroundColor: "rgba(255, 193, 7, 0.9)",   // Yellow for finish
    },
    stopMarkerText: {
        color: "white",
        fontSize: SQUARE_SIZE * 0.4,
        fontWeight: "bold",
    },
    specialStopText: {
        fontSize: SQUARE_SIZE * 0.25,  // Smaller font for "Start" and "Finish"
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
    legendStopMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(255, 87, 34, 0.9)", // Orange marker for stops
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    legendStartMarker: {
        backgroundColor: "rgba(33, 150, 243, 0.9)",  // Blue for start
    },
    legendFinishMarker: {
        backgroundColor: "rgba(255, 193, 7, 0.9)",   // Yellow for finish
    },
    legendStopMarkerText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    legendPathLine: {
        width: 16,
        height: 2,
        backgroundColor: "rgba(33, 33, 33, 0.8)",
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        color: "#333",
    },
});

export default StoreLayoutSection;
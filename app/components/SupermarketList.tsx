// app/components/SupermarketList.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, Square, AmplifyClient } from "../../types";
import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Default size for compact view
const EXPANDED_SQUARE_SIZE = Math.floor(width / 10); // Larger size for expanded view

const SupermarketList = () => {
  const { user } = useAuthenticator();
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupermarket, setSelectedSupermarket] = useState<Supermarket | null>(null);
  const [layoutData, setLayoutData] = useState<Square[][]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedLayoutView, setExpandedLayoutView] = useState(false);

  // Generate the API client
  const client = generateClient() as unknown as AmplifyClient;

  useEffect(() => {
    fetchSupermarkets();
  }, []);

  // Reset expanded view when modal closes
  useEffect(() => {
    if (!modalVisible) {
      setExpandedLayoutView(false);
    }
  }, [modalVisible]);

  const fetchSupermarkets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all supermarkets from your DataStore
      const response = await client.models.Supermarket.list();

      if (response.data) {
        setSupermarkets(response.data);
      }
    } catch (err) {
      console.error("Error fetching supermarkets:", err);
      setError("Failed to load supermarkets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupermarketSelect = (supermarket: Supermarket) => {
    try {
      // Parse the layout JSON string
      const parsedLayout = JSON.parse(supermarket.layout) as Square[][];
      setLayoutData(parsedLayout);
      setSelectedSupermarket(supermarket);
      setModalVisible(true);
    } catch (err) {
      console.error("Error parsing layout:", err);
      setError(
        "Failed to load supermarket layout. The layout data may be corrupted."
      );
    }
  };

  const toggleLayoutView = () => {
    setExpandedLayoutView(!expandedLayoutView);
  };

  const getSquareColor = (type: Square["type"]) => {
    switch (type) {
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

  const renderSquare = (square: Square, currentSquareSize: number) => {
    return (
      <View
        key={`${square.row}-${square.col}`}
        style={[
          styles.square,
          {
            backgroundColor: getSquareColor(square.type),
            width: currentSquareSize,
            height: currentSquareSize,
          },
        ]}
      />
    );
  };

  const renderLayout = (isExpanded: boolean) => {
    const currentSquareSize = isExpanded ? EXPANDED_SQUARE_SIZE : SQUARE_SIZE;

    return (
      <View style={styles.layoutContainer}>
        {layoutData.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((square) => renderSquare(square, currentSquareSize))}
          </View>
        ))}
      </View>
    );
  };

  const renderLegendItem = (type: Square["type"], label: string) => (
    <View style={styles.legendRow}>
      <View
        style={[
          styles.legendSquare,
          { backgroundColor: getSquareColor(type) },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Supermarket }) => (
    <TouchableOpacity
      style={styles.supermarketItem}
      onPress={() => handleSupermarketSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.supermarketIconContainer}>
        <Ionicons name="storefront-outline" size={28} color="#2E7D32" />
      </View>
      <View style={styles.supermarketContent}>
        <Text style={styles.supermarketName}>{item.name}</Text>
        {item.address && (
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={14} color="#757575" style={styles.addressIcon} />
            <Text style={styles.supermarketAddress}>{item.address}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading supermarkets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#d32f2f" style={styles.errorIcon} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchSupermarkets}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Supermarkets</Text>

      {supermarkets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color="#BDBDBD" style={styles.emptyIcon} />
          <Text style={styles.emptyStateText}>No supermarkets found</Text>
          <Text style={styles.emptyStateSubtext}>Check back later or try reloading</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={fetchSupermarkets}>
            <Ionicons name="refresh-outline" size={20} color="#2E7D32" />
            <Text style={styles.reloadButtonText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={supermarkets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Supermarket Layout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="light" />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="map-outline" size={24} color="#2E7D32" style={styles.modalIcon} />
                <Text style={styles.modalTitle}>{selectedSupermarket?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close-circle" size={28} color="#757575" />
              </TouchableOpacity>
            </View>

            <View style={styles.layoutHeaderContainer}>
              <View style={styles.layoutHeaderRow}>
                <Text style={styles.layoutHeaderText}>Store Layout</Text>
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={toggleLayoutView}
                >
                  <Ionicons
                    name={expandedLayoutView ? "contract-outline" : "expand-outline"}
                    size={20}
                    color="#2E7D32"
                  />
                  <Text style={styles.expandButtonText}>
                    {expandedLayoutView ? "Compact View" : "Expand View"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.layoutSubheaderText}>
                {expandedLayoutView
                  ? "Tap 'Compact View' to return to normal size"
                  : "Tap 'Expand View' to see a larger map"}
              </Text>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={toggleLayoutView}
                style={styles.layoutTouchable}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={expandedLayoutView}
                  contentContainerStyle={expandedLayoutView ? styles.expandedLayoutContent : {}}
                >
                  {renderLayout(expandedLayoutView)}
                </ScrollView>

                {!expandedLayoutView && (
                  <View style={styles.tapToExpandOverlay}>
                    <View style={styles.tapToExpandButton}>
                      <Ionicons name="expand-outline" size={16} color="white" />
                      <Text style={styles.tapToExpandText}>Tap to expand</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Legend</Text>
                <View style={styles.legendGrid}>
                  {renderLegendItem("empty", "Empty Space")}
                  {renderLegendItem("products", "Products")}
                  {renderLegendItem("cash_register", "Cash Register")}
                  {renderLegendItem("entrance", "Entrance")}
                  {renderLegendItem("exit", "Exit")}
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
    marginLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  supermarketItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  supermarketIconContainer: {
    backgroundColor: "#E8F5E9",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  supermarketContent: {
    flex: 1,
  },
  supermarketName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressIcon: {
    marginRight: 4,
  },
  supermarketAddress: {
    fontSize: 14,
    color: "#757575",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    marginBottom: 24,
  },
  reloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: "#2E7D32",
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#757575",
  },
  errorIcon: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "white",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  layoutHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  layoutHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  layoutHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  layoutSubheaderText: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
    marginLeft: 4,
  },
  modalScrollContent: {
    flex: 1,
  },
  layoutTouchable: {
    position: "relative",
    margin: 16,
  },
  layoutContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expandedLayoutContent: {
    padding: 8,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    borderWidth: 0.5,
    borderColor: "#ffffff",
  },
  tapToExpandOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  tapToExpandButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 125, 50, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tapToExpandText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  legendContainer: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginVertical: 8,
  },
  legendSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: "#333",
  },
});

export default SupermarketList;
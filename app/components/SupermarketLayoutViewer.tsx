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


// Create a responsive square size based on screen width
const { width } = Dimensions.get("window");
const SQUARE_SIZE = Math.floor(width / 20); // Adjust divisor as needed for your layout

const SupermarketList = () => {
  const { user } = useAuthenticator();
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupermarket, setSelectedSupermarket] =
    useState<Supermarket | null>(null);
  const [layoutData, setLayoutData] = useState<Square[][]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Generate the API client
  const client = generateClient() as unknown as AmplifyClient;

  useEffect(() => {
    fetchSupermarkets();
  }, []);

  const fetchSupermarkets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all supermarkets from your DataStore
      const response = await client.models.Supermarket.list();
      console.log(response.data[0]);

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

  const renderSquare = (square: Square) => {
    return (
      <View
        key={`${square.row}-${square.col}`}
        style={[
          styles.square,
          {
            backgroundColor: getSquareColor(square.type),
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
          },
        ]}
      />
    );
  };

  const renderLayout = () => {
    return (
      <View style={styles.layoutContainer}>
        {layoutData.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((square) => renderSquare(square))}
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Supermarket }) => (
    <TouchableOpacity
      style={styles.supermarketItem}
      onPress={() => handleSupermarketSelect(item)}
    >
      <Text style={styles.supermarketName}>{item.name}</Text>
      {item.address && (
        <Text style={styles.supermarketAddress}>{item.address}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading supermarkets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
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
      <Text style={styles.header}>Supermarkets</Text>

      {supermarkets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No supermarkets found</Text>
        </View>
      ) : (
        <FlatList
          data={supermarkets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedSupermarket?.name}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <ScrollView horizontal>{renderLayout()}</ScrollView>

            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Legend:</Text>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getSquareColor("empty") },
                  ]}
                />
                <Text style={styles.legendText}>Empty</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getSquareColor("products") },
                  ]}
                />
                <Text style={styles.legendText}>Products</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getSquareColor("cash_register") },
                  ]}
                />
                <Text style={styles.legendText}>Cash Register</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getSquareColor("entrance") },
                  ]}
                />
                <Text style={styles.legendText}>Entrance</Text>
              </View>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getSquareColor("exit") },
                  ]}
                />
                <Text style={styles.legendText}>Exit</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  supermarketItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  supermarketName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  supermarketAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#2196F3",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  layoutContainer: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    borderWidth: 0.5,
    borderColor: "#999",
  },
  legendContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  legendSquare: {
    width: 20,
    height: 20,
    borderWidth: 0.5,
    borderColor: "#999",
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: "#333",
  },
});

export default SupermarketList;

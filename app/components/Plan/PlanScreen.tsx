import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Supermarket, AmplifyClient } from "../../../types";
import ScreenLayout from "../ScreenLayout";

const PlanScreen = () => {
  const router = useRouter();
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const client = generateClient() as unknown as AmplifyClient;

  useEffect(() => {
    fetchSupermarkets();
  }, []);

  const fetchSupermarkets = async () => {
    try {
      setLoading(true);
      setError(null);
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
    router.push({
      pathname: "/shopping-list/[id]",
      params: { id: supermarket.id },
    });
  };

  const renderItem = ({ item }: { item: Supermarket }) => (
    <TouchableOpacity
      style={styles.supermarketItem}
      onPress={() => handleSupermarketSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <View style={styles.supermarketInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={28} color="#2E7D32" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.supermarketName}>{item.name}</Text>
            {item.address && (
              <Text style={styles.supermarketAddress}>{item.address}</Text>
            )}
          </View>
        </View>
        <View style={styles.planButton}>
          <Ionicons name="list" size={16} color="white" />
          <Text style={styles.planButtonText}>Create Plan</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredSupermarkets = supermarkets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <ScreenLayout title="Plan Your Shopping">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading supermarkets...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout title="Plan Your Shopping">
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={60} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSupermarkets}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Plan Your Shopping">
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle" size={22} color="#2E7D32" />
            <Text style={styles.infoCardTitle}>How It Works</Text>
          </View>
          <Text style={styles.infoCardText}>
            Create an optimized shopping path based on your grocery list and save time!
            Select a supermarket below to get started.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Available Supermarkets</Text>

        {/* 🔍 Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            placeholder="Search for a supermarket..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>

        {filteredSupermarkets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={60} color="#bdbdbd" />
            <Text style={styles.emptyStateText}>No supermarkets found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSupermarkets}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: "#616161",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  supermarketInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
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
  planButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
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
    marginTop: 12,
  },
});

export default PlanScreen;

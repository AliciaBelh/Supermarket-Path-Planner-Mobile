// components/SupermarketList.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Supermarket, AmplifyClient } from "../types";
import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { useRouter, Stack } from "expo-router";



const SupermarketList = () => {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Use object format for router.push
      router.push({
        pathname: "/shopping-list/[id]",
        params: { id: supermarket.id }
      });
    } catch (err) {
      console.error("Error navigating to shopping list:", err);
      Alert.alert("Error", "Failed to open shopping list. Please try again.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: () => signOut(),
      },
    ]);
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
      <View style={styles.createListButton}>
        <Text style={styles.createListButtonText}>Create Shopping List</Text>
      </View>
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
    <>
      <Stack.Screen
        options={{
          title: "Supermarket Path Planner",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome, {user?.username}</Text>
        <Text style={styles.header}>Select a Supermarket</Text>

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
      </View>
    </>
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  welcomeText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
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
  createListButton: {
    marginTop: 12,
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  createListButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
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
  signOutButton: {
    marginRight: 15,
    backgroundColor: "#FF3B30",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default SupermarketList;

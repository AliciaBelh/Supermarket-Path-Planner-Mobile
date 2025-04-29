import React from "react";
import {
  View,
  StyleSheet,
  Button,
  SafeAreaView,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";
import outputs from "./amplify_outputs.json";
import SupermarketList from "../components/SupermarketNavigator";

Amplify.configure(outputs);

const HomeScreen = () => {
  const { signOut, user } = useAuthenticator();

  const handleSignOut = async () => {
    try {
      // Show a confirmation dialog
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              console.log("Signing out user:", user?.username);
              await signOut();
              console.log("User signed out successfully");
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error in handleSignOut:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Supermarket Path Planner</Text>
      </View>

      <View style={styles.userBar}>
        <Text style={styles.welcomeText}>Welcome, {user?.username}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <SupermarketList />
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <Authenticator.Provider>
      <Authenticator>
        <HomeScreen />
      </Authenticator>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  userBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
  },
  signOutButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  signOutText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default App;

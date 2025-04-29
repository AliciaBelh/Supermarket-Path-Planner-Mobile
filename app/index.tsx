import React from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
  TouchableOpacity,
  StatusBar,
  Image,
  ImageBackground,
} from "react-native";
import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";
import { Ionicons } from "@expo/vector-icons";
import outputs from "./amplify_outputs.json";
import SupermarketList from "../components/SupermarketNavigator";

Amplify.configure(outputs);

const HomeScreen = () => {
  const { signOut, user } = useAuthenticator();

  const handleSignOut = async () => {
    try {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
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
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }} // Replace with your actual logo
            style={styles.logo}
          />
          <Text style={styles.headerTitle}>Supermarket Path Planner</Text>
        </View>
      </View>

      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?q=80&w=1000&auto=format&fit=crop" }}
        resizeMode="cover"
        style={styles.backgroundImage}
      >
        <View style={styles.overlay} />

        <View style={styles.userBar}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={24} color="#2E7D32" />
            <View style={styles.userTextContainer}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.username}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="exit-outline" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Plan Your Shopping Trip</Text>
          <Text style={styles.infoCardText}>
            Select a supermarket below to create an optimized shopping path
            for your grocery list and save time!
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.contentContainer}>
        <SupermarketList />
      </View>
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
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    backgroundColor: "#2E7D32", // Dark green header
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: 10,
    tintColor: "white",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  backgroundImage: {
    width: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  userBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userTextContainer: {
    marginLeft: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: "#616161",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32", // Dark green
  },
  signOutButton: {
    backgroundColor: "#F44336", // Material Design red
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buttonIcon: {
    marginRight: 6,
  },
  signOutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: "#616161",
    lineHeight: 20,
  },
});

export default App;
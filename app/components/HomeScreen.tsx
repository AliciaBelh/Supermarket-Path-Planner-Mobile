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
    ScrollView,
} from "react-native";
import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { Ionicons } from "@expo/vector-icons";

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
                        source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
                        style={styles.logo}
                    />
                    <Text style={styles.headerTitle}>Supermarket Path Planner</Text>
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

            <ScrollView style={styles.contentContainer}>
                <ImageBackground
                    source={{ uri: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?q=80&w=1000&auto=format&fit=crop" }}
                    resizeMode="cover"
                    style={styles.backgroundImage}
                >
                    <View style={styles.overlay} />

                    <View style={styles.userProfileSection}>
                        <View style={styles.userAvatarContainer}>
                            <Ionicons name="person-circle" size={80} color="#2E7D32" />
                            <View style={styles.userTextContainer}>
                                <Text style={styles.welcomeText}>Welcome back,</Text>
                                <Text style={styles.userName}>{user?.username}</Text>
                            </View>
                        </View>
                    </View>
                </ImageBackground>

                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Ionicons name="information-circle" size={24} color="#2E7D32" />
                            <Text style={styles.infoCardTitle}>About Supermarket Path Planner</Text>
                        </View>
                        <Text style={styles.infoCardText}>
                            This app helps you save time while shopping by creating optimized paths through supermarkets.
                        </Text>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoCardHeader}>
                            <Ionicons name="list" size={24} color="#2E7D32" />
                            <Text style={styles.infoCardTitle}>How to Use</Text>
                        </View>
                        <Text style={styles.infoCardText}>
                            1. Go to the Plan tab{"\n"}
                            2. Select a supermarket{"\n"}
                            3. Create your shopping list{"\n"}
                            4. Follow the optimized path
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.startPlanningButton}>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                        <Text style={styles.startPlanningText}>Go to Planning</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    logoContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        width: 28,
        height: 28,
        marginRight: 10,
        tintColor: "white",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "white",
    },
    backgroundImage: {
        width: "100%",
        height: 240,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
    },
    contentContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    userProfileSection: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    userAvatarContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    userTextContainer: {
        alignItems: "center",
        marginTop: 10,
    },
    welcomeText: {
        fontSize: 14,
        color: "#616161",
    },
    userName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2E7D32", // Dark green
        marginVertical: 5,
    },
    userEmail: {
        fontSize: 14,
        color: "#666",
    },
    signOutButton: {
        backgroundColor: "#F44336", // Material Design red
        paddingVertical: 6,
        paddingHorizontal: 12,
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
    infoSection: {
        padding: 16,
        marginTop: 10,
    },
    infoCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    infoCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
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
        lineHeight: 22,
    },
    startPlanningButton: {
        backgroundColor: "#2E7D32",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 10,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    startPlanningText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
});
export default HomeScreen;
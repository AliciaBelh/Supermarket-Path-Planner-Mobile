// components/HomeScreen.tsx
import React from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
    ImageBackground,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenLayout from "./ScreenLayout";

const HomeScreen = () => {
    const router = useRouter();

    const navigateToPlan = () => {
        router.push("/plan");
    };

    return (
        <ScreenLayout title="Supermarket Path Planner">
            <ScrollView style={styles.contentContainer}>

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

                    <TouchableOpacity
                        style={styles.startPlanningButton}
                        onPress={navigateToPlan}
                    >
                        <Ionicons name="arrow-forward" size={20} color="white" />
                        <Text style={styles.startPlanningText}>Go to Planning</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    backgroundImage: {
        width: "100%",
        height: 240,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
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
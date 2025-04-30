import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
    Alert,
    StatusBar,
    Image,
} from "react-native";
import { generateClient } from "aws-amplify/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Product, Supermarket, AmplifyClient } from "../../../types";

const PlanScreen = () => {
    const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        Alert.alert(
            "Plan Shopping Trip",
            `Create a shopping plan for ${supermarket.name}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Continue",
                    onPress: () => {
                        // Navigate to the shopping list screen using the supermarket ID
                        router.push({
                            pathname: "/shopping-list/[id]",
                            params: { id: supermarket.id }
                        });
                    }
                }
            ]
        );
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

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
                            style={styles.logo}
                        />
                        <Text style={styles.headerTitle}>Plan Your Shopping</Text>
                    </View>
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.loadingText}>Loading supermarkets...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
                            style={styles.logo}
                        />
                        <Text style={styles.headerTitle}>Plan Your Shopping</Text>
                    </View>
                </View>
                <View style={styles.centered}>
                    <Ionicons name="alert-circle" size={60} color="#d32f2f" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchSupermarkets}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Image
                        source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
                        style={styles.logo}
                    />
                    <Text style={styles.headerTitle}>Plan Your Shopping</Text>
                </View>
            </View>

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

                {supermarkets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="cart-outline" size={60} color="#bdbdbd" />
                        <Text style={styles.emptyStateText}>No supermarkets found</Text>
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
            </View>
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
        backgroundColor: "#2E7D32",
        flexDirection: "row",
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
        marginBottom: 12,
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
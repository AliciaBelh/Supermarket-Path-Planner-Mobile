// app/components/Plan/ShoppingListManager.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { generateClient } from "aws-amplify/api";
// No auth import needed
import { Ionicons } from "@expo/vector-icons";
import { ShoppingList, ShoppingListStatus, AmplifyClient } from "../../../types";

interface ShoppingListManagerProps {
    supermarketId: string;
    selectedProducts: string[];
    onShoppingListLoaded?: (productIds: string[]) => void;
    currentUser?: {
        username: string;
    };
}

const ShoppingListManager: React.FC<ShoppingListManagerProps> = (props) => {
    const {
        supermarketId,
        selectedProducts,
        onShoppingListLoaded,
        currentUser
    } = props;
    // Use the user prop passed from parent
    const client = generateClient() as unknown as AmplifyClient;

    const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNewListModal, setShowNewListModal] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [currentList, setCurrentList] = useState<ShoppingList | null>(null);
    const [showListsModal, setShowListsModal] = useState(false);

    // Fetch user's shopping lists for this supermarket
    useEffect(() => {
        if (supermarketId && currentUser?.username) {
            fetchShoppingLists();
        }
    }, [supermarketId, currentUser?.username]);

    const fetchShoppingLists = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await client.models.ShoppingList.list({
                filter: {
                    and: [
                        { supermarketID: { eq: supermarketId } },
                        { owner: { eq: currentUser?.username } }
                    ]
                }
            });

            if (response.data) {
                setShoppingLists(response.data);

                // If there's a draft list, set it as current
            }
        } catch (err) {
            console.error("Error fetching shopping lists:", err);
            setError("Failed to load your shopping lists");
        } finally {
            setLoading(false);
        }
    };

    const createNewList = async () => {
        if (!newListName.trim()) {
            Alert.alert("Error", "Please enter a name for your shopping list");
            return;
        }

        try {
            setSaving(true);

            const newList: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'> = {
                name: newListName.trim(),
                owner: currentUser?.username || '',
                productIDs: JSON.stringify(selectedProducts),
                supermarketID: supermarketId,
            };

            const response = await client.models.ShoppingList.create({
                input: newList
            });

            if (response.data) {
                setCurrentList(response.data);
                setShoppingLists(prevLists => [...prevLists, response.data]);
                setNewListName("");
                setShowNewListModal(false);
                Alert.alert("Success", "Shopping list created successfully");
            }
        } catch (err) {
            console.error("Error creating shopping list:", err);
            Alert.alert("Error", "Failed to create shopping list");
        } finally {
            setSaving(false);
        }
    };

    const updateCurrentList = async () => {
        if (!currentList) {
            return;
        }

        try {
            setSaving(true);

            const updatedList = {
                id: currentList.id,
                productIDs: JSON.stringify(selectedProducts),
            };

            const response = await client.models.ShoppingList.update({
                input: updatedList
            });

            if (response.data) {
                setCurrentList(response.data);
                setShoppingLists(prevLists =>
                    prevLists.map(list =>
                        list.id === response.data.id ? response.data : list
                    )
                );
                Alert.alert("Success", "Shopping list updated successfully");
            }
        } catch (err) {
            console.error("Error updating shopping list:", err);
            Alert.alert("Error", "Failed to update shopping list");
        } finally {
            setSaving(false);
        }
    };

    const loadShoppingList = (list: ShoppingList) => {
        setCurrentList(list);
        setShowListsModal(false);

        // Parse product IDs and notify parent
        if (onShoppingListLoaded) {
            try {
                const productIds = JSON.parse(list.productIDs);
                onShoppingListLoaded(productIds);
            } catch (e) {
                console.error("Error parsing productIDs:", e);
                Alert.alert("Error", "Failed to load shopping list items");
            }
        }
    };

    const activateList = async () => {
        if (!currentList) {
            Alert.alert("Error", "No shopping list selected");
            return;
        }

        if (selectedProducts.length === 0) {
            Alert.alert("Error", "Please select at least one product for your shopping list");
            return;
        }

        try {
            setSaving(true);

            const updatedList = {
                id: currentList.id,
                status: 'active' as ShoppingListStatus,
                productIDs: JSON.stringify(selectedProducts),
            };

            const response = await client.models.ShoppingList.update({
                input: updatedList
            });

            if (response.data) {
                setCurrentList(response.data);
                setShoppingLists(prevLists =>
                    prevLists.map(list =>
                        list.id === response.data.id ? response.data : list
                    )
                );
                Alert.alert("Success", "Shopping list is now active! You can use it for navigation.");
            }
        } catch (err) {
            console.error("Error activating shopping list:", err);
            Alert.alert("Error", "Failed to activate shopping list");
        } finally {
            setSaving(false);
        }
    };

    const renderListItem = ({ item }: { item: ShoppingList }) => {
        // Parse productIDs to get count
        let productCount = 0;
        try {
            const productIds = JSON.parse(item.productIDs);
            productCount = productIds.length;
        } catch (e) {
            console.error("Error parsing productIDs:", e);
        }

        // Format date
        const createdDate = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : 'Unknown date';

        return (
            <TouchableOpacity
                style={[
                    styles.listItem,
                    currentList?.id === item.id && styles.selectedListItem
                ]}
                onPress={() => loadShoppingList(item)}
            >
                <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{item.name}</Text>
                    <Text style={styles.listItemSubtitle}>
                        {productCount} item{productCount !== 1 ? 's' : ''} • {createdDate}
                    </Text>

                </View>

                {currentList?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
            </TouchableOpacity>
        );
    };

    // If no user is provided, don't render the shopping list manager
    if (!currentUser?.username) {
        return (
            <View style={styles.container}>
                <View style={styles.noUserContainer}>
                    <Text style={styles.noUserText}>
                        Please sign in to manage your shopping lists
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Shopping List Controls */}
            <View style={styles.controlsContainer}>
                {currentList ? (
                    <View style={styles.currentListContainer}>
                        <View style={styles.currentListInfo}>
                            <Text style={styles.currentListLabel}>Current List:</Text>
                            <Text style={styles.currentListName}>{currentList.name}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={updateCurrentList}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="save-outline" size={16} color="white" />
                                        <Text style={styles.buttonText}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                        </View>
                    </View>
                ) : (
                    <Text style={styles.noListText}>No shopping list selected</Text>
                )}

                <View style={styles.listButtons}>
                    <TouchableOpacity
                        style={styles.newListButton}
                        onPress={() => setShowNewListModal(true)}
                    >
                        <Ionicons name="add-circle-outline" size={16} color="white" />
                        <Text style={styles.buttonText}>New List</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.myListsButton}
                        onPress={() => setShowListsModal(true)}
                    >
                        <Ionicons name="list-outline" size={16} color="white" />
                        <Text style={styles.buttonText}>My Lists</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* New List Modal */}
            <Modal
                visible={showNewListModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewListModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create New Shopping List</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter list name"
                            value={newListName}
                            onChangeText={setNewListName}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setNewListName("");
                                    setShowNewListModal(false);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.createButton}
                                onPress={createNewList}
                                disabled={saving || !newListName.trim()}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.createButtonText}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* My Lists Modal */}
            <Modal
                visible={showListsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowListsModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.listsModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>My Shopping Lists</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowListsModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
                                    onPress={fetchShoppingLists}
                                >
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : shoppingLists.length === 0 ? (
                            <View style={styles.emptyListContainer}>
                                <Ionicons name="cart-outline" size={48} color="#BDBDBD" />
                                <Text style={styles.emptyListText}>
                                    You don't have any shopping lists yet
                                </Text>
                                <TouchableOpacity
                                    style={styles.createFirstListButton}
                                    onPress={() => {
                                        setShowListsModal(false);
                                        setTimeout(() => setShowNewListModal(true), 300);
                                    }}
                                >
                                    <Text style={styles.createFirstListButtonText}>
                                        Create Your First List
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <FlatList
                                data={shoppingLists}
                                renderItem={renderListItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContainer}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    controlsContainer: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    noUserContainer: {
        padding: 16,
        backgroundColor: "#FFF3E0",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FFE0B2",
    },
    noUserText: {
        fontSize: 16,
        color: "#E65100",
        textAlign: "center",
    },
    currentListContainer: {
        marginBottom: 16,
    },
    currentListInfo: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 12,
    },
    currentListLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginRight: 8,
    },
    currentListName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 4,
    },
    draftBadge: {
        backgroundColor: "#E0E0E0",
    },
    activeBadge: {
        backgroundColor: "#4CAF50",
    },
    completedBadge: {
        backgroundColor: "#2196F3",
    },
    statusText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "white",
    },
    actionButtons: {
        flexDirection: "row",
        marginBottom: 8,
    },
    saveButton: {
        backgroundColor: "#2196F3",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        flexDirection: "row",
        alignItems: "center",
        marginRight: 8,
    },
    activateButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        flexDirection: "row",
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        marginLeft: 4,
    },
    noListText: {
        fontSize: 16,
        color: "#666",
        marginBottom: 16,
        fontStyle: "italic",
    },
    listButtons: {
        flexDirection: "row",
    },
    newListButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        marginRight: 8,
    },
    myListsButton: {
        backgroundColor: "#FF9800",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 24,
        width: "80%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    listsModalContent: {
        backgroundColor: "white",
        borderRadius: 8,
        width: "90%",
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    closeButton: {
        padding: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 4,
        padding: 12,
        fontSize: 16,
        marginVertical: 16,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        color: "#666",
    },
    createButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    createButtonText: {
        fontSize: 16,
        color: "white",
        fontWeight: "bold",
    },
    loader: {
        padding: 24,
    },
    errorContainer: {
        padding: 24,
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#D32F2F",
        marginBottom: 16,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: "#2196F3",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    retryButtonText: {
        fontSize: 16,
        color: "white",
        fontWeight: "bold",
    },
    emptyListContainer: {
        padding: 32,
        alignItems: "center",
    },
    emptyListText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginTop: 16,
        marginBottom: 24,
    },
    createFirstListButton: {
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4,
    },
    createFirstListButtonText: {
        fontSize: 16,
        color: "white",
        fontWeight: "bold",
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    selectedListItem: {
        borderColor: "#4CAF50",
        backgroundColor: "#F1F8E9",
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    listItemSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    listItemBadge: {
        backgroundColor: "#E0E0E0",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginTop: 8,
    },
    listItemBadgeText: {
        fontSize: 12,
        color: "#333",
    },
});

export default ShoppingListManager;
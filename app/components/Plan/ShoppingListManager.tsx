// app/components/Plan/ShoppingListManager.tsx
import React, { useState, useEffect, useMemo } from "react";
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
import {
  ShoppingList,
  ShoppingListStatus,
  AmplifyClient,
} from "../../../types";

// --- Helpers: JSON safety and response handling ---
const safeStringifyProductIDs = (ids: string[]): string => {
  try {
    return JSON.stringify(Array.isArray(ids) ? ids : []);
  } catch (e) {
    console.warn("Failed to stringify product IDs, defaulting to []:", e);
    return "[]";
  }
};

const safeParseProductIDs = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x) => typeof x === "string");
    }
    return [];
  } catch (e) {
    console.warn("Failed to parse product IDs, returning []:", e);
    return [];
  }
};

const hasResponseErrors = (resp: any): boolean => {
  return Array.isArray(resp?.errors) && resp.errors.length > 0;
};

const getResponseDataOrThrow = <T,>(resp: any, action: string): T => {
  // Log the raw response for easier field-shape debugging
  try {
    console.debug(`[${action}] raw response:`, JSON.stringify(resp));
  } catch {}

  if (hasResponseErrors(resp)) {
    console.warn(`${action} returned errors:`, resp.errors);
    const firstMsg =
      resp.errors?.[0]?.message || resp.errors?.[0] || "Unknown error";
    throw new Error(`${action} failed: ${firstMsg}`);
  }

  // Common Amplify shape
  if (resp && resp.data) {
    return resp.data as T;
  }
  // Some clients return { item }
  if (resp && resp.item) {
    return resp.item as T;
  }
  // Or { result }
  if (resp && resp.result) {
    return resp.result as T;
  }
  // Or the object directly
  if (resp && typeof resp === "object" && "id" in resp) {
    return resp as T;
  }

  throw new Error(`${action} failed: no data in response`);
};

interface ShoppingListManagerProps {
  supermarketId: string;
  selectedProducts: string[];
  onShoppingListLoaded?: (productIds: string[]) => void;
  currentUser?: {
    username: string;
  };
}

const ShoppingListManager: React.FC<ShoppingListManagerProps> = (props) => {
  const { supermarketId, selectedProducts, onShoppingListLoaded, currentUser } =
    props;
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
  const [showSelectHint, setShowSelectHint] = useState(false);
  const [needsFirstSave, setNeedsFirstSave] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameTarget, setRenameTarget] = useState<ShoppingList | null>(null);

  // Compare selected products with current list contents to determine if there are changes
  const hasChanges = useMemo(() => {
    if (!currentList) return false;
    const currentIds = new Set(safeParseProductIDs(currentList.productIDs));
    const selectedIds = new Set(selectedProducts);
    if (currentIds.size !== selectedIds.size) return true;
    for (const id of selectedIds) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  }, [currentList, selectedProducts]);

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
          supermarketID: { eq: supermarketId },
        },
      });

      const lists: ShoppingList[] = (((response as any)?.data ??
        (response as any)?.items) ||
        []) as any;
      if (Array.isArray(lists)) {
        console.debug("Fetched shopping lists:", lists.length);
        // Sort by updatedAt desc, fallback to createdAt
        const sorted = [...lists].sort((a, b) => {
          const ad = a.updatedAt || a.createdAt || "";
          const bd = b.updatedAt || b.createdAt || "";
          return bd.localeCompare(ad);
        });
        setShoppingLists(sorted);

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
      console.debug("Creating new shopping list", {
        name: newListName.trim(),
        owner: currentUser?.username,
        supermarketID: supermarketId,
        selectedCount: selectedProducts.length,
      });

      const newList = {
        name: newListName.trim(),
        // Start with empty items so the user selects products then saves once
        productIDs: safeStringifyProductIDs([]),
        supermarketID: supermarketId,
      };

      // Amplify Data client expects fields directly (no { input })
      const response = await client.models.ShoppingList.create(newList as any);
      const created = getResponseDataOrThrow<ShoppingList>(
        response,
        "Create shopping list"
      );
      console.debug("Shopping list created successfully", created.id);
      setCurrentList(created);
      setShoppingLists((prevLists) => [...prevLists, created]);
      setNewListName("");
      setShowNewListModal(false);
      setShowSelectHint(true);
      setNeedsFirstSave(true);
      Alert.alert("Success", "Shopping list created successfully");
      // Refresh lists in background to ensure server state is reflected
      fetchShoppingLists();
    } catch (err: any) {
      console.error("Error creating shopping list:", err);
      const msg =
        err?.errors?.[0]?.message ||
        err?.message ||
        "Failed to create shopping list";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const updateCurrentList = async () => {
    if (!currentList) {
      return;
    }

    if (selectedProducts.length === 0) {
      Alert.alert("Error", "Please select at least one product before saving");
      return;
    }

    try {
      setSaving(true);

      const updatedList = {
        id: currentList.id,
        productIDs: safeStringifyProductIDs(selectedProducts),
        status: "active" as ShoppingListStatus,
      };

      // Amplify Data client expects fields directly (no { input })
      const response = await client.models.ShoppingList.update(
        updatedList as any
      );
      const updated = getResponseDataOrThrow<ShoppingList>(
        response,
        "Update shopping list"
      );
      setCurrentList(updated);
      setShoppingLists((prevLists) =>
        prevLists.map((list) => (list.id === updated.id ? updated : list))
      );
      setShowSelectHint(false);
      setNeedsFirstSave(false);
      setIsEditing(false);
      Alert.alert("Success", "Shopping list saved and activated");
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
    setNeedsFirstSave(false);

    // Parse product IDs and notify parent
    if (onShoppingListLoaded) {
      const productIds = safeParseProductIDs(list.productIDs);
      onShoppingListLoaded(productIds);
    }
  };

  // Begin edit mode to change list contents
  const startChangeList = (list: ShoppingList) => {
    loadShoppingList(list);
    setIsEditing(true);
  };

  // Rename list: open modal for a specific target and save
  const openRenameModal = (list?: ShoppingList) => {
    if (list) {
      setRenameTarget(list);
      setRenameName(list.name || "");
      setShowRenameModal(true);
      return;
    }
    if (currentList) {
      // Fallback: if ever called without a list, use currentList
      setRenameTarget(currentList);
      setRenameName(currentList.name || "");
      setShowRenameModal(true);
    }
  };

  const renameList = async () => {
    const target = renameTarget;
    if (!target) {
      Alert.alert("Error", "No list selected to rename");
      return;
    }
    const newName = renameName.trim();
    if (!newName) {
      Alert.alert("Error", "Please enter a valid name");
      return;
    }
    try {
      setSaving(true);
      const response = await client.models.ShoppingList.update({
        id: target.id,
        name: newName,
      } as any);
      const updated = getResponseDataOrThrow<ShoppingList>(
        response,
        "Rename shopping list"
      );
      setShoppingLists((prev) =>
        prev.map((l) =>
          l.id === updated.id ? { ...l, name: updated.name } : l
        )
      );
      if (currentList?.id === updated.id) {
        setCurrentList({ ...currentList, name: updated.name });
      }
      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameName("");
      Alert.alert("Success", "List renamed");
    } catch (err: any) {
      console.error("Error renaming shopping list:", err);
      const msg = err?.message || "Failed to rename list";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteList = (list: ShoppingList) => {
    Alert.alert(
      "Delete list",
      `Are you sure you want to delete "${list.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteList(list),
        },
      ]
    );
  };

  const deleteList = async (list: ShoppingList) => {
    try {
      setSaving(true);
      const response = await client.models.ShoppingList.delete({
        id: list.id,
      } as any);
      // We don't need the deleted entity, just ensure no errors
      getResponseDataOrThrow<any>(response, "Delete shopping list");
      setShoppingLists((prev) => prev.filter((l) => l.id !== list.id));
      if (currentList?.id === list.id) {
        setCurrentList(null);
        setNeedsFirstSave(false);
        setShowSelectHint(false);
        setIsEditing(false);
        onShoppingListLoaded?.([]);
      }
      Alert.alert("Deleted", "Shopping list deleted");
    } catch (err: any) {
      console.error("Error deleting shopping list:", err);
      const msg = err?.message || "Failed to delete list";
      Alert.alert("Error", msg);
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
      : "Unknown date";

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          currentList?.id === item.id && styles.selectedListItem,
        ]}
        onPress={() => loadShoppingList(item)}
      >
        <View style={styles.listItemContent}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.inlineIconBtn}
              onPress={() => openRenameModal(item)}
              accessibilityLabel={`Rename ${item.name}`}
            >
              <Ionicons name="create-outline" size={16} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.listItemTitle}>{item.name}</Text>
          </View>
          <Text style={styles.listItemSubtitle}>
            {productCount} item{productCount !== 1 ? "s" : ""} • {createdDate}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.itemActionBtn}
            onPress={() => startChangeList(item)}
          >
            <Text style={styles.changeTextBtn}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.itemActionBtn}
            onPress={() => confirmDeleteList(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#C62828" />
          </TouchableOpacity>
          {currentList?.id === item.id && (
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
          )}
        </View>
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

            {showSelectHint && selectedProducts.length === 0 && (
              <View style={styles.hintBanner}>
                <Ionicons name="information-circle" size={16} color="#0B61A4" />
                <Text style={styles.hintText}>
                  Select products below, then tap Save to add them to this list.
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              {(needsFirstSave || (isEditing && hasChanges)) && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateCurrentList}
                  disabled={
                    saving || selectedProducts.length === 0 || !hasChanges
                  }
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="white" />
                      <Text style={styles.buttonText}>
                        {needsFirstSave ? "Save" : "Save changes"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.noListText}>No shopping list selected</Text>
        )}

        <View style={styles.listButtons}>
          <TouchableOpacity
            style={styles.newListButton}
            onPress={() => {
              console.debug("Opening New List modal");
              setShowNewListModal(true);
            }}
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
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!saving && newListName.trim()) {
                  createNewList();
                }
              }}
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={[styles.closeButton, { marginRight: 8 }]}
                  onPress={fetchShoppingLists}
                >
                  <Ionicons name="refresh" size={22} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowListsModal(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#4CAF50"
                style={styles.loader}
              />
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
                    console.debug("Empty state CTA: Create Your First List");
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
                refreshing={loading}
                onRefresh={fetchShoppingLists}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Rename list modal (triggered from My Lists) */}
      <Modal
        visible={showRenameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Shopping List</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter new name"
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!saving && renameName.trim()) {
                  renameList();
                }
              }}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRenameModal(false);
                  setRenameTarget(null);
                  setRenameName("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createButton}
                onPress={renameList}
                disabled={saving || !renameName.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.createButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  hintBanner: {
    backgroundColor: "#E6F2FF",
    borderColor: "#B3DAFF",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hintText: {
    color: "#0B61A4",
    marginLeft: 6,
    fontSize: 12,
    flex: 1,
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
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginLeft: 6,
  },
  changeTextBtn: {
    color: "#2196F3",
    fontWeight: "600",
  },
  inlineIconBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginRight: 4,
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

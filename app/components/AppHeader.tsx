import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { getCurrentUser } from "aws-amplify/auth";

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title = "Supermarket Path Planner",
  showBackButton = false,
  onBackPress,
}) => {
  const { signOut } = useAuthenticator();
  const [menuVisible, setMenuVisible] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUserEmail(currentUser?.signInDetails?.loginId || null);
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        setUserEmail(null);
      }
    };

    fetchUserInfo();
  }, []);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleSignOut = async () => {
    try {
      toggleMenu();
      setTimeout(() => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                console.error("Error signing out:", error);
                Alert.alert("Error", "Failed to sign out. Please try again.");
              }
            },
          },
        ]);
      }, 300);
    } catch (error) {
      console.error("Error in handleSignOut:", error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      <View style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoPlaceholder} />
        )}

        <Text style={styles.headerTitle}>{title}</Text>

        <TouchableOpacity style={styles.profileButton} onPress={toggleMenu} activeOpacity={0.7}>
          <Ionicons name="person-circle" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* User Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={toggleMenu}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuCloseButton} onPress={toggleMenu}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.userInfoContainer}>
              <View style={styles.userAvatarContainer}>
                <Ionicons name="person-circle" size={70} color="#2E7D32" />
              </View>
              <Text style={styles.userNameText}>
                {userEmail || "User"}
              </Text>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Ionicons name="exit-outline" size={24} color="#F44336" />
              <Text style={styles.menuItemTextDanger}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 4,
  },
  profileButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
  },
  menuContainer: {
    backgroundColor: "white",
    position: "absolute",
    right: 16,
    top: 65,
    width: 230,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    overflow: "hidden",
  },
  menuCloseButton: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 10,
  },
  userInfoContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#F5F5F5",
  },
  userAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemTextDanger: {
    fontSize: 16,
    color: "#F44336",
    marginLeft: 12,
    fontWeight: "500",
  },
});

export default AppHeader;

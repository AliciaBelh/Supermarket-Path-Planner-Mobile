// components/ScreenLayout.tsx
import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import AppHeader from "./AppHeader";

interface ScreenLayoutProps {
    children: React.ReactNode;
    title?: string;
    showBackButton?: boolean;
}

/**
 * A common layout component for screens that includes the app header
 * and proper padding/styling for content.
 */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
    children,
    title,
    showBackButton = false,
}) => {
    const router = useRouter();

    const handleBackPress = () => {
        router.back();
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title={title}
                showBackButton={showBackButton}
                onBackPress={handleBackPress}
            />
            <View style={styles.content}>{children}</View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    content: {
        flex: 1,
    },
});

export default ScreenLayout;
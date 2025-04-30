// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
    return (
        <View style={styles.container}>
            <AppHeader />
            <Tabs
                screenOptions={{
                    headerShown: false, // Using our custom header
                    tabBarActiveTintColor: '#2E7D32',
                    tabBarInactiveTintColor: '#757575',
                    tabBarLabelStyle: {
                        fontSize: 12,
                        fontWeight: '600',
                    },
                    tabBarStyle: {
                        backgroundColor: 'white',
                        borderTopColor: '#E0E0E0',
                        paddingVertical: 5,
                        height: 60,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home" color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="plan"
                    options={{
                        title: 'Plan',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="list" color={color} size={size} />
                        ),
                    }}
                />
            </Tabs>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
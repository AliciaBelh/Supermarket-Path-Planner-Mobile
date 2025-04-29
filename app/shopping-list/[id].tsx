// app/shopping-list/[id].tsx
import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import ShoppingList from "../components/Plan/ShoppingList";

export default function ShoppingListScreen() {
    const { id } = useLocalSearchParams();

    if (!id) {
        return null; // Or show an error message
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: "Shopping List",
                    headerShown: true,
                }}
            />
            <ShoppingList supermarketId={String(id)} />
        </>
    );
}
// app/shopping-list/[id].tsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import ShoppingList from "../components/Plan/ShoppingList";
import ScreenLayout from "../components/ScreenLayout";
import { Authenticator } from "@aws-amplify/ui-react-native";

export default function ShoppingListScreen() {
    const { id } = useLocalSearchParams();

    if (!id) {
        return null; // Or show an error message
    }

    return (
        <Authenticator.Provider>
            <ScreenLayout title="Shopping List" showBackButton={true}>
                <ShoppingList supermarketId={String(id)} />
            </ScreenLayout>
        </Authenticator.Provider>
    );
}
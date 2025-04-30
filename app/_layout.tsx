// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react-native";
import outputs from "./amplify_outputs.json";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure Amplify with your AWS resources
Amplify.configure(outputs);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Authenticator.Provider>
        <Authenticator>
          <Stack
            screenOptions={{
              headerShown: false, // We'll use our custom header
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="shopping-list/[id]"
              options={{
                headerShown: false,  // Changed this to false since we'll use our ScreenLayout
                presentation: 'card'
              }}
            />
          </Stack>
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  );
}
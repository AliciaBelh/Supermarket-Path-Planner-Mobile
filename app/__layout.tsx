import React from "react";
import { Stack } from "expo-router";
import { Authenticator } from "@aws-amplify/ui-react-native";
import { Amplify } from "aws-amplify";
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
              headerStyle: {
                backgroundColor: "#FFFFFF",
              },
              headerTintColor: "#333333",
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }}
          />
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  );
}

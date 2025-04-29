import React from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react-native";
import outputs from "./amplify_outputs.json";
import AppNavigator from "./components/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure Amplify with your AWS resources
Amplify.configure(outputs);

const App = () => {
  return (
    <SafeAreaProvider>
      <Authenticator.Provider>
        <Authenticator>
          <AppNavigator />
        </Authenticator>
      </Authenticator.Provider>
    </SafeAreaProvider>
  );
};

export default App;
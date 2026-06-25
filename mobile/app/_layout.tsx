import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="login"
              options={{
                title:        'Sign In',
                headerStyle:  { backgroundColor: COLORS.white },
                headerTintColor: COLORS.primary,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="register"
              options={{
                title:        'Create Account',
                headerStyle:  { backgroundColor: COLORS.white },
                headerTintColor: COLORS.primary,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="property/[id]"
              options={{
                headerShown: false,   // custom header inside screen
              }}
            />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

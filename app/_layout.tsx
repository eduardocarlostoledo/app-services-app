import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="recover" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="role-select" />
        <Stack.Screen name="verify-identity" />
        <Stack.Screen name="payment-methods" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="admin-broadcast" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="publish" options={{ presentation: 'modal' }} />
        <Stack.Screen name="service/[id]" />
        <Stack.Screen name="offer/[id]" />
        <Stack.Screen name="payment/[id]" />
        <Stack.Screen name="address/[id]" />
        <Stack.Screen name="progress/[id]" />
        <Stack.Screen name="confirm/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="dispute/[id]" />
        <Stack.Screen name="rating/[id]" />
      </Stack>
    </AuthProvider>
  );
}

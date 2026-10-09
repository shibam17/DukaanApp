import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { BusinessProvider, useBusiness } from '../hooks/useBusiness';
import LoginScreen from '../screens/LoginScreen';
import SetupBusinessScreen from '../screens/SetupBusinessScreen';

function AuthenticatedApp() {
  const { business, loading, createBusiness } = useBusiness();

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.flex}>
        <SetupBusinessScreen createBusiness={createBusiness} />
      </SafeAreaView>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product" options={{ headerShown: false }} />
      <Stack.Screen name="sale" options={{ headerShown: false }} />
      <Stack.Screen name="purchase" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="low-stock" options={{ title: 'Low Stock' }} />
    </Stack>
  );
}

function RootGate() {
  const { session, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!session || !user) {
    return (
      <SafeAreaView style={styles.flex}>
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <BusinessProvider userId={user.id}>
      <AuthenticatedApp />
    </BusinessProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootGate />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});

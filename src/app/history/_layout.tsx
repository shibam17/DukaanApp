import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="sales" options={{ title: 'Sales History' }} />
      <Stack.Screen name="purchases" options={{ title: 'Purchase History' }} />
    </Stack>
  );
}

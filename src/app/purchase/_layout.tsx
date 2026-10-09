import { Stack } from 'expo-router';

export default function PurchaseLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Record Purchase' }} />
    </Stack>
  );
}

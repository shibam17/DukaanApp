import { Stack } from 'expo-router';

export default function SaleLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Record Sale' }} />
    </Stack>
  );
}

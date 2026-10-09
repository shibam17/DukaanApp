import { Stack } from 'expo-router';

export default function ProductLayout() {
  return (
    <Stack>
      <Stack.Screen name="add" options={{ title: 'Add Product', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Edit Product' }} />
    </Stack>
  );
}

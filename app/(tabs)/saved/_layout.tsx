import React from 'react';
import { Stack } from 'expo-router';

export default function SavedStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="recent" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

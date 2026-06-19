import React from 'react';
import { Stack } from 'expo-router';

export default function CalculateStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="result"
        options={({ route }) => ({
          gestureEnabled: !(route.params as { returnTo?: string } | undefined)?.returnTo,
        })}
      />
    </Stack>
  );
}

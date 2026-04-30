import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';

const TabIcon = ({ symbol }: { symbol: string; color: string }) => (
  <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.lg }}>{symbol}</Text>
);

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colours.primary,
        tabBarInactiveTintColor: colours.textSecondary,
        tabBarStyle: {
          backgroundColor: colours.white,
          borderTopColor: colours.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.heading,
          fontSize: fontSizes.xs,
        },
        headerStyle: { backgroundColor: colours.primary },
        headerTintColor: colours.white,
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: fontSizes.md,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.calculator'),
          tabBarIcon: ({ color }) => <TabIcon symbol="🧮" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('tabs.saved'),
          tabBarIcon: ({ color }) => <TabIcon symbol="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: t('tabs.about'),
          tabBarIcon: ({ color }) => <TabIcon symbol="ℹ️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <TabIcon symbol="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

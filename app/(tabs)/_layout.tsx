import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';

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

const TabIcon = ({ symbol }: { symbol: string; color: string }) => {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
};

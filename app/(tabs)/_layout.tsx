import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';
import { confirmResultLeave, hasResultLeaveGuard } from '@/navigation/resultLeaveGuard';

const TabIcon = ({ symbol }: { symbol: string; color: string }) => (
  <Text style={{ fontFamily: fonts.body, fontSize: fontSizes.lg }}>{symbol}</Text>
);

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        tabPress: event => {
          const state = navigation.getState();
          const currentRoute = state.routes[state.index];

          if (currentRoute?.name === 'result' && route.name !== 'result' && hasResultLeaveGuard()) {
            event.preventDefault();
            confirmResultLeave(() => navigation.navigate(route.name));
          }
        },
      })}
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen
        name="result"
        options={{
          href: null,
          title: t('results.title'),
        }}
      />
    </Tabs>
  );
}

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookmarkIcon } from '@/components/ui/Icons/BookmarkIcon/BookmarkIcon';
import { CoinsStackedIcon } from '@/components/ui/Icons/CoinsStackedIcon/CoinsStackedIcon';
import { InfoCircleIcon } from '@/components/ui/Icons/InfoCircleIcon/InfoCircleIcon';
import { SettingsIcon } from '@/components/ui/Icons/SettingsIcon/SettingsIcon';
import { colours, elevation, fontFaces, fontSizes, radii } from '@/theme';
import { confirmResultLeave, hasResultLeaveGuard } from '@/navigation/resultLeaveGuard';

type TabIconName = 'calculator' | 'saved' | 'about' | 'settings';

const TabIcon = ({ name, color }: { name: TabIconName; color: string }) => {
  if (name === 'calculator') {
    return <CoinsStackedIcon color={color} size={24} strokeWidth={1.9} />;
  }

  if (name === 'saved') {
    return <BookmarkIcon color={color} size={24} strokeWidth={1.9} />;
  }

  if (name === 'about') {
    return <InfoCircleIcon color={color} size={24} strokeWidth={1.9} />;
  }

  return <SettingsIcon color={color} size={24} strokeWidth={1.9} />;
};

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        tabPress: event => {
          const state = navigation.getState();
          const currentRoute = state.routes[state.index];
          const navigateToTab = () => {
            if (route.name === 'index') {
              navigation.navigate('index', { dashboard: String(Date.now()) });
              return;
            }

            navigation.navigate(route.name);
          };

          if (currentRoute?.name === 'result' && route.name !== 'result' && hasResultLeaveGuard()) {
            event.preventDefault();
            confirmResultLeave(navigateToTab);
            return;
          }

          if (route.name === 'index') {
            event.preventDefault();
            navigateToTab();
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colours.primary,
        tabBarInactiveTintColor: colours.textSecondary,
        sceneStyle: {
          backgroundColor: colours.background,
        },
        tabBarStyle: {
          backgroundColor: colours.surfaceRaised,
          borderTopColor: colours.borderSoft,
          height: 72,
          paddingTop: 6,
          paddingBottom: 6,
          ...elevation.nav,
        },
        tabBarLabelStyle: {
          ...fontFaces.heading.bold,
          fontSize: fontSizes.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        tabBarItemStyle: {
          borderRadius: radii.lg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon name="calculator" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('tabs.saved'),
          tabBarIcon: ({ color }) => <TabIcon name="saved" color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: t('tabs.about'),
          tabBarIcon: ({ color }) => <TabIcon name="about" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
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

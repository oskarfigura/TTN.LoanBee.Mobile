import React from 'react';
import { Tabs } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colours, fonts, fontSizes } from '@/theme';
import { confirmResultLeave, hasResultLeaveGuard } from '@/navigation/resultLeaveGuard';

type TabIconName = 'calculator' | 'saved' | 'about' | 'settings';

const TabIcon = ({ name, color }: { name: TabIconName; color: string }) => {
  if (name === 'calculator') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13 5c0 1.105-2.462 2-5.5 2S2 6.105 2 5m11 0c0-1.105-2.462-2-5.5-2S2 3.895 2 5m11 0v1.5M2 5v12c0 1.105 2.462 2 5.5 2m0-8c-.169 0-.335-.003-.5-.008C4.197 10.9 2 10.043 2 9m5.5 6C4.462 15 2 14.105 2 13m20-1.5c0 1.105-2.462 2-5.5 2s-5.5-.895-5.5-2m11 0c0-1.105-2.462-2-5.5-2s-5.5.895-5.5 2m11 0V19c0 1.105-2.462 2-5.5 2s-5.5-.895-5.5-2v-7.5m11 3.75c0 1.105-2.462 2-5.5 2s-5.5-.895-5.5-2"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'saved') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C7.28 3 8.12 3 9.8 3h4.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C19 5.28 19 6.12 19 7.8V21l-7-4-7 4z"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === 'about') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.727 14.727a1.5 1.5 0 00.3 1.655l.055.054a1.816 1.816 0 010 2.573 1.818 1.818 0 01-2.573 0l-.055-.055a1.5 1.5 0 00-1.654-.3 1.5 1.5 0 00-.91 1.373v.155a1.818 1.818 0 11-3.636 0V20.1a1.5 1.5 0 00-.981-1.373 1.5 1.5 0 00-1.655.3l-.054.055a1.818 1.818 0 01-3.106-1.287 1.818 1.818 0 01.533-1.286l.054-.055a1.5 1.5 0 00.3-1.654 1.5 1.5 0 00-1.372-.91h-.155a1.818 1.818 0 110-3.636H3.9a1.5 1.5 0 001.373-.981 1.5 1.5 0 00-.3-1.655l-.055-.054A1.818 1.818 0 117.491 4.99l.054.054a1.5 1.5 0 001.655.3h.073a1.5 1.5 0 00.909-1.372v-.155a1.818 1.818 0 013.636 0V3.9a1.499 1.499 0 00.91 1.373 1.5 1.5 0 001.654-.3l.054-.055a1.817 1.817 0 012.573 0 1.819 1.819 0 010 2.573l-.055.054a1.5 1.5 0 00-.3 1.655v.073a1.5 1.5 0 001.373.909h.155a1.818 1.818 0 010 3.636H20.1a1.499 1.499 0 00-1.373.91z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

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

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/shared/ui/components/Icon';
import { colours, elevation, fontFaces, fontSizes, radii } from '@/shared/ui/theme';

type TabIconName = 'home' | 'calculate' | 'saved' | 'settings';

const TabIcon = ({ name, color }: { name: TabIconName; color: string }) => {
  if (name === 'home') {
    return <Icon icon={IconName.HomeIcon} color={color} size={24} strokeWidth={1.9} />;
  }

  if (name === 'saved') {
    return <Icon icon={IconName.BookmarkIcon} color={color} size={24} strokeWidth={1.9} />;
  }

  if (name === 'calculate') {
    return <Icon icon={IconName.PlusCircleIcon} color={color} size={24} strokeWidth={1.9} />;
  }

  return <Icon icon={IconName.SettingsIcon} color={color} size={24} strokeWidth={1.9} />;
};

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={({ navigation, route }) => ({
        tabPress: event => {
          const navigateToTab = () => {
            if (route.name === 'index') {
              navigation.navigate('index');
              return;
            }

            if (route.name === 'calculate') {
              navigation.navigate('calculate', {
                screen: 'index',
                params: {
                  calculator: String(Date.now()),
                  fromResult: '',
                  fromTracked: '',
                  returnResultParams: '',
                  returnTo: '',
                },
              });
              return;
            }

            navigation.navigate(route.name);
          };

          if (route.name === 'index' || route.name === 'calculate') {
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
          // Add the device bottom inset so the bar clears the Android system
          // navigation (e.g. Samsung S21 gesture/button bar) and the iOS home
          // indicator instead of sitting underneath them. Base height stays 72 so
          // the icon+label content area is unchanged from before.
          height: 72 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
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
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
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
        name="calculate"
        options={{
          title: t('tabs.calculator'),
          tabBarIcon: ({ color }) => <TabIcon name="calculate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}

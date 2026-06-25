import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { COLORS, FONT } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICON: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  index:      { active: 'home',          inactive: 'home-outline'         },
  properties: { active: 'search',        inactive: 'search-outline'       },
  saved:      { active: 'heart',         inactive: 'heart-outline'        },
  profile:    { active: 'person',        inactive: 'person-outline'       },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle:             styles.bar,
        tabBarLabelStyle:        styles.label,
        headerStyle:             { backgroundColor: COLORS.white },
        headerTintColor:         COLORS.primary,
        headerTitleStyle:        { fontWeight: '700' as const },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICON[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index"      options={{ title: 'Home',   headerShown: false }} />
      <Tabs.Screen name="properties" options={{ title: 'Browse', headerTitle: 'Browse Properties' }} />
      <Tabs.Screen name="saved"      options={{ title: 'Saved',  headerTitle: 'Saved Properties' }} />
      <Tabs.Screen name="profile"    options={{ title: 'Account',headerTitle: 'My Account' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopColor:      '#E5E7EB',
    borderTopWidth:      1,
    paddingBottom:       Platform.OS === 'ios' ? 0 : 6,
    paddingTop:          6,
    height:              Platform.OS === 'ios' ? 82 : 62,
    backgroundColor:     COLORS.white,
  },
  label: {
    fontSize:   FONT.xs,
    fontWeight: '600',
  },
});

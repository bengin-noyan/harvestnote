/**
 * Alt sekmeli navigasyon: Tarla ve Kiler.
 *
 * Sekme çubuğu toprak paletiyle boyandı; ikonlar için ekstra bir ikon
 * kütüphanesi kurmak yerine emoji kullanılıyor (proje kuralı: gereksiz
 * bağımlılık yok).
 */
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FarmScreen } from '../screens/FarmScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { borders, colors, spacing, typography } from '../theme';

export type RootTabParamList = {
  Farm: undefined;
  Inventory: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// DarkTheme'i yayarak kuruyoruz: React Navigation 6 ve 7'nin Theme tipleri
// farkli (v7 ayrica `fonts` istiyor), spread ikisinde de derleniyor.
const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.leaf,
    background: colors.soilDeep,
    card: colors.bark,
    text: colors.textOnDark,
    border: colors.soil,
    notification: colors.gold,
  },
};

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.icon, focused && styles.iconFocused]}>
      <Text style={styles.iconText}>{emoji}</Text>
    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: colors.goldLight,
          tabBarInactiveTintColor: colors.textOnDarkMuted,
        }}
      >
        <Tab.Screen
          name="Farm"
          component={FarmScreen}
          options={{
            title: 'Tarla',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🌾" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{
            title: 'Kiler',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🧺" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bark,
    borderTopWidth: borders.thick,
    borderTopColor: colors.soil,
    height: 64,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tabLabel: { ...typography.caption },
  icon: {
    width: 34,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  iconFocused: { backgroundColor: colors.soil },
  iconText: { fontSize: 17 },
});

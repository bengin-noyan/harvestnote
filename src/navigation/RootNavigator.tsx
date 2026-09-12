/**
 * Alt sekmeli navigasyon: Tarla ve Kiler.
 *
 * Sekme çubuğu kağıt yüzeyinde durur ve tarladan yalnızca ince bir çizgiyle
 * ayrılır; ikonlar için ekstra bir ikon kütüphanesi kurmak yerine emoji
 * kullanılıyor (proje kuralı: gereksiz bağımlılık yok).
 */
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FarmScreen } from '../screens/FarmScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { borders, colors, radii, spacing, typography } from '../theme';

export type RootTabParamList = {
  Farm: undefined;
  Inventory: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// DefaultTheme'i yayarak kuruyoruz: React Navigation 6 ve 7'nin Theme tipleri
// farkli (v7 ayrica `fonts` istiyor), spread ikisinde de derleniyor.
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.leafDeep,
    background: colors.ground,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.rule,
    notification: colors.goldDeep,
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
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textMuted,
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
    backgroundColor: colors.surface,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.rule,
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
    borderRadius: radii.sm,
  },
  /** Seçili sekme dolgu değil, hafif bir zeminle işaretlenir. */
  iconFocused: { backgroundColor: colors.surfaceSunken },
  iconText: { fontSize: 17 },
});

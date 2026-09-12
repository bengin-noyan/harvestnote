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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/** Sekme çubuğunun jest çubuğu hariç kendi yüksekliği. */
const TAB_BAR_HEIGHT = 60;

export function RootNavigator() {
  /**
   * Alt güvenli alan elle ekleniyor: `tabBarStyle`'a sabit bir `height`
   * verildiği anda React Navigation'ın insets'i yüksekliğe kendi ekleme
   * davranışı devre dışı kalıyor ve çubuk jest çubuğunun altında eziliyor.
   * Sabit yüksekliği koruyup insets'i kendimiz eklemek ikisini de sağlıyor.
   */
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom + spacing.xs,
            },
          ],
          tabBarLabelStyle: styles.tabLabel,
          // Sekme etiketi sabit yükseklikte bir kutuda; sistem yazı tipi
          // büyütmesi burada kırpılmaya yol açıyor, anlamı zaten ikon taşıyor.
          tabBarAllowFontScaling: false,
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
  /** Yükseklik ve alt dolgu güvenli alana göre satır içinde veriliyor. */
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.rule,
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

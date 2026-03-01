import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import TabNavigator from './src/navigation/TabNavigator';
import { colors } from './src/theme/colors';

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor={colors.card} />
      <NavigationContainer theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.danger,
        }
      }}>
        <TabNavigator />
      </NavigationContainer>
    </>
  );
}

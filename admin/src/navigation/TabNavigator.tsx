import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, List, HardHat, Settings } from 'lucide-react-native';
import { colors } from '../theme/colors';

// Ekranlar
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.card,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                },
                headerTintColor: colors.primary,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingBottom: 5,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Özet',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                    title: 'YMH | Canlı İzleme'
                }}
            />
            <Tab.Screen
                name="Transactions"
                component={TransactionsScreen}
                options={{
                    tabBarLabel: 'İrsaliyeler',
                    tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
                    title: 'Tüm İrsaliyeler'
                }}
            />
            <Tab.Screen
                name="Projects"
                component={ProjectsScreen}
                options={{
                    tabBarLabel: 'Şantiyeler',
                    tabBarIcon: ({ color, size }) => <HardHat color={color} size={size} />,
                    title: 'Projeler'
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Yönetim',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                    title: 'Admin Paneli'
                }}
            />
        </Tab.Navigator>
    );
}

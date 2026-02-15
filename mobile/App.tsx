import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CameraScreen from './src/screens/CameraScreen';
import ConfirmationScreen from './src/screens/ConfirmationScreen';
import { DatabaseService } from './src/services/Database';
import { SyncService } from './src/services/SyncService';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

export default function App() {
    useEffect(() => {
        // Init DB
        DatabaseService.init().catch(e => console.error('DB Init Failed', e));
        // Register Background Task
        SyncService.registerTask().catch(e => console.error('Sync Register Failed', e));
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <StatusBar style="light" />
                    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#000' } }}>
                        <Stack.Screen name="Camera" component={CameraScreen} />
                        <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

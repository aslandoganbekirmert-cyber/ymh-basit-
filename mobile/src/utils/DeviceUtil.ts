import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// If expo-device fails or user privacy prevents full IDs, we will store a UUID locally.
// For robust apps, generating and saving a UUID is usually better than relying on volatile device identifiers.
const DEVICE_ID_KEY = 'device_installation_id';

export class DeviceUtil {
    static async getDeviceId(): Promise<string> {
        try {
            // Check existing ID
            const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
            if (existing) {
                return existing;
            }

            const newId = Crypto.randomUUID();
            await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
            return newId;
        } catch (e) {
            console.warn('SecureStore error, falling back to temp ID', e);
            // Fallback if SecureStore fails (e.g. dev build with issues)
            return 'TEMP_DEV_ID';
        }
    }
}

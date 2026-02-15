import { DatabaseService } from './Database';
import { Delivery } from '../types';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../config';

const BATCH_SIZE = 10;

// Background fetch removed - not supported in Expo Go.
// Will be re-added when using a development build (EAS Build).

export class SyncService {
    static async registerTask() {
        // Background fetch is only available in dev builds, not Expo Go.
        // Silently skip registration in Expo Go.
        console.log('Background sync skipped (Expo Go limitation).');
    }

    static async syncBatch(): Promise<boolean> {
        const state = await NetInfo.fetch();
        if (!state.isConnected) return false;

        // 1. Get Pending Deliveries
        const pending = await DatabaseService.getPendingDeliveries(BATCH_SIZE);
        if (pending.length === 0) return false;

        let syncedCount = 0;

        // 2. Process One by One
        for (const delivery of pending) {
            try {
                const success = await this.sendTransaction(delivery);
                if (success) {
                    await DatabaseService.markIdsAsSynced([delivery.id]);
                    syncedCount++;
                }
            } catch (e) {
                console.warn(`Failed to sync delivery ${delivery.id}`, e);
                // Continue to next item
            }
        }

        return syncedCount > 0;
    }

    private static async sendTransaction(delivery: Delivery): Promise<boolean> {
        const formData = new FormData();

        // Backend field names (match backend DTO)
        if (delivery.projectName) formData.append('project_id', delivery.projectName);
        if (delivery.vehiclePlate) formData.append('plate_number', delivery.vehiclePlate);
        if (delivery.materialType) formData.append('material_type', delivery.materialType);
        formData.append('quantity', delivery.quantity.toString());
        formData.append('unit', delivery.unit);
        formData.append('type', 'IN');

        if (delivery.supplier) formData.append('supplier_name', delivery.supplier);
        if (delivery.receiptNo) formData.append('ticket_number', delivery.receiptNo);
        if (delivery.note) formData.append('notes', delivery.note);

        // Append Photo as 'file' (backend expects FileInterceptor('file'))
        if (delivery.photoLocalPath) {
            formData.append('file', {
                uri: delivery.photoLocalPath,
                name: `photo_${delivery.id}.jpg`,
                type: 'image/jpeg',
            } as any);
        }

        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            // 409 = Duplicate, already exists on backend → treat as synced
            if (response.status === 409) {
                console.log(`[Sync] Already synced (duplicate): ${delivery.receiptNo}`);
                return true;
            }

            const text = await response.text();
            console.error(`Sync Error ${response.status}: ${text}`);
            return false;
        }

        return true;
    }
}

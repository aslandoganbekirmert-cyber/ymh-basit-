import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { Delivery, DeliveryInput } from '../types';
import { DeviceUtil } from '../utils/DeviceUtil';

export class DatabaseService {

    private static db: SQLite.SQLiteDatabase | null = null;

    private static async getDb(): Promise<SQLite.SQLiteDatabase> {
        if (!this.db) {
            this.db = await SQLite.openDatabaseAsync('ymh_saha_v3.db');
        }
        return this.db;
    }

    static async init() {
        const db = await this.getDb();

        // Create Table using execAsync for multiple statements
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS material_deliveries (
            id TEXT PRIMARY KEY NOT NULL,
            projectId TEXT NOT NULL,
            projectName TEXT,
            userId TEXT NOT NULL,
            materialType TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            vehiclePlate TEXT NOT NULL,
            supplier TEXT,
            receiptNo TEXT,
            note TEXT,
            photoLocalPath TEXT NOT NULL,
            photoHash TEXT NOT NULL,
            ocrRawText TEXT,
            ocrConfidence REAL,
            latitude REAL,
            longitude REAL,
            createdAt TEXT NOT NULL,
            synced INTEGER DEFAULT 0,
            idempotencyKey TEXT NOT NULL,
            deviceId TEXT NOT NULL
        );
    `);

        // Create Index
        await db.runAsync('CREATE INDEX IF NOT EXISTS idx_synced ON material_deliveries (synced);');
    }

    static async addDelivery(delivery: DeliveryInput, projectId: string, userId: string): Promise<Delivery> {
        const db = await this.getDb();

        // Duplicate check: same receiptNo + vehiclePlate
        if (delivery.receiptNo && delivery.vehiclePlate) {
            const existing = await db.getFirstAsync<any>(
                'SELECT id FROM material_deliveries WHERE receiptNo = ? AND vehiclePlate = ?',
                [delivery.receiptNo, delivery.vehiclePlate]
            );
            if (existing) {
                throw new Error(`Bu irsaliye zaten kaydedilmiş (Fiş: ${delivery.receiptNo}, Plaka: ${delivery.vehiclePlate})`);
            }
        }

        const id = Crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const deviceId = await DeviceUtil.getDeviceId();
        const idempotencyKey = `${deviceId}_${id}`;

        let photoHash = 'TEMP_HASH';
        try {
            const fileInfo = await FileSystem.getInfoAsync(delivery.photoLocalPath);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(delivery.photoLocalPath, { encoding: 'base64' });
                photoHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
            }
        } catch (e) {
            console.warn('Hash generation failed', e);
        }

        const deliveryRecord: Delivery = {
            id,
            projectId,
            projectName: delivery.projectName || projectId,
            userId,
            ...delivery,
            supplier: delivery.supplier,
            receiptNo: delivery.receiptNo,
            note: delivery.note,
            ocrConfidence: delivery.ocrConfidence || 0,
            photoHash,
            createdAt,
            synced: false,
            deviceId,
            idempotencyKey,
        };

        // Use runAsync for insert
        await db.runAsync(
            `INSERT INTO material_deliveries (
                id, projectId, projectName, userId, materialType, quantity, unit, vehiclePlate,
                supplier, receiptNo, note,
                photoLocalPath, photoHash, ocrRawText, ocrConfidence, latitude, longitude, 
                createdAt, synced, idempotencyKey, deviceId
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                deliveryRecord.id,
                deliveryRecord.projectId,
                deliveryRecord.projectName || '',
                deliveryRecord.userId,
                deliveryRecord.materialType,
                deliveryRecord.quantity,
                deliveryRecord.unit,
                deliveryRecord.vehiclePlate,
                deliveryRecord.supplier || null,
                deliveryRecord.receiptNo || null,
                deliveryRecord.note || null,
                deliveryRecord.photoLocalPath,
                deliveryRecord.photoHash,
                deliveryRecord.ocrRawText || '',
                deliveryRecord.ocrConfidence || 0,
                deliveryRecord.latitude || 0,
                deliveryRecord.longitude || 0,
                deliveryRecord.createdAt,
                0, // synced false
                deliveryRecord.idempotencyKey,
                deliveryRecord.deviceId
            ]
        );

        return deliveryRecord;
    }

    static async getPendingDeliveries(limit = 50): Promise<Delivery[]> {
        const db = await this.getDb();
        // getAllAsync returns typed array directly
        const results = await db.getAllAsync<Delivery>(
            `SELECT * FROM material_deliveries WHERE synced = 0 LIMIT ?;`,
            [limit]
        );
        return results;
    }

    static async markIdsAsSynced(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const db = await this.getDb();

        // Generate placeholders like ?,?,?
        const placeholders = ids.map(() => '?').join(',');

        await db.runAsync(
            `UPDATE material_deliveries SET synced = 1 WHERE id IN (${placeholders})`,
            ids
        );
    }
}

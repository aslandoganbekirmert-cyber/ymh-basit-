import * as SQLite from 'expo-sqlite';

export enum MaterialType {
    KUM = 'KUM',
    BYPASS = 'BYPASS',
    FILLER = 'FILLER',
    PARKE = 'PARKE',
    BETON = 'BETON',
    HAFRIYAT_TOPRAGI = 'HAFRİYAT TOPRAĞI',
    CURUF = 'CÜRUF',
    DIGER = 'DİĞER',
}

export const DEFAULT_MATERIALS = [
    MaterialType.KUM,
    MaterialType.BYPASS,
    MaterialType.FILLER,
    MaterialType.PARKE,
    MaterialType.BETON,
    MaterialType.HAFRIYAT_TOPRAGI,
    MaterialType.CURUF,
    MaterialType.DIGER,
];

export enum Unit {
    TON = 'TON',
    M3 = 'M3',
    ADET = 'ADET',
}

export interface Delivery {
    id: string; // UUID
    projectId: string;
    userId: string;
    materialType: MaterialType;
    quantity: number;
    unit: Unit;
    vehiclePlate: string;
    photoLocalPath: string;
    photoHash: string;
    ocrRawText?: string;
    ocrConfidence: number; // 0-1
    latitude?: number;
    longitude?: number;
    createdAt: string; // ISO string
    synced: boolean;

    // Idempotency
    deviceId: string;
    idempotencyKey: string; // deviceId + local_record_uuid

    // New Fields
    projectName?: string; // Optional for migration
    supplier?: string;
    receiptNo?: string;
    note?: string;
}

export interface DeliveryInput {
    materialType: MaterialType;
    quantity: number;
    unit: Unit;
    vehiclePlate: string;
    photoLocalPath: string;
    ocrRawText?: string;
    ocrConfidence?: number;
    latitude?: number;
    longitude?: number;

    // New Fields
    projectName?: string;
    supplier?: string;
    receiptNo?: string;
    note?: string;
}

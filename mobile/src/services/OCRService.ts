import { MaterialType, Unit } from '../types';
import * as FileSystem from 'expo-file-system/legacy';

// OCR is now server-side! Mobile sends photo to backend and gets parsed data back.
const API_BASE_URL = 'http://192.168.1.101:3000/api/v1'; // Mac's local IP for device testing

interface OCRResult {
    rawText: string;
    material?: MaterialType;
    quantity?: number;
    unit?: Unit;
    plate?: string;
    supplier?: string;
    ticketNumber?: string;
    confidence: number;
}

export class OCRService {
    /**
     * Send photo to backend OCR endpoint for server-side analysis.
     * Backend uses Google Cloud Vision API for accurate Turkish waybill parsing.
     */
    static async analyzeImage(localUri: string): Promise<OCRResult> {
        try {
            // Create form data with the photo
            const formData = new FormData();
            formData.append('file', {
                uri: localUri,
                name: 'waybill.jpg',
                type: 'image/jpeg',
            } as any);

            const response = await fetch(`${API_BASE_URL}/ocr/analyze`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                console.warn('OCR API Error:', response.status);
                return { rawText: '', confidence: 0 };
            }

            const result = await response.json();

            if (!result.success) {
                console.warn('OCR failed:', result.error);
                return { rawText: result.text || '', confidence: 0 };
            }

            // Map backend OCR response to mobile OCRResult format
            return this.mapBackendResult(result);

        } catch (error) {
            console.warn('OCR request failed (offline?):', error);
            return { rawText: '', confidence: 0 };
        }
    }

    /**
     * Map backend OCR result to mobile-friendly format
     */
    private static mapBackendResult(result: any): OCRResult {
        const data = result.data || {};

        // Map material type to enum
        let material: MaterialType | undefined;
        if (data.materialType) {
            const upper = data.materialType.toUpperCase();
            for (const mat of Object.values(MaterialType)) {
                if (upper.includes(mat)) {
                    material = mat;
                    break;
                }
            }
        }

        // Map unit
        let unit: Unit | undefined;
        if (data.unit) {
            const upperUnit = data.unit.toUpperCase();
            if (upperUnit.includes('TON') || upperUnit === 'KG') unit = Unit.TON;
            else if (upperUnit.includes('M3') || upperUnit.includes('M³')) unit = Unit.M3;
            else if (upperUnit.includes('ADET')) unit = Unit.ADET;
        }

        // Parse quantity
        let quantity: number | undefined;
        if (data.quantity) {
            const parsed = parseFloat(data.quantity.toString().replace(',', '.'));
            if (!isNaN(parsed)) quantity = parsed;
        }

        return {
            rawText: result.text || '',
            material,
            quantity,
            unit,
            plate: data.plateNumber || undefined,
            supplier: data.supplierName || undefined,
            ticketNumber: data.ticketNumber || undefined,
            confidence: (result.confidence || 0) / 100, // Backend returns 0-100, mobile uses 0-1
        };
    }
}

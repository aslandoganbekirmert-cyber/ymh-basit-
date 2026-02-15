import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IStorageService {
    private readonly uploadDir = path.resolve('./uploads');

    constructor() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
        console.log('[LocalStorage] Initialized at:', this.uploadDir);
    }

    async upload(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<{ key: string; bucket: string; url: string }> {
        const filePath = path.join(this.uploadDir, fileName);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileBuffer);
        console.log('[LocalStorage] Saved:', filePath);
        return {
            key: fileName,
            bucket: 'local',
            url: `/uploads/${fileName}`,
        };
    }

    async delete(key: string): Promise<void> {
        const filePath = path.join(this.uploadDir, key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

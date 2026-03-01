import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class SheetsService {
    private serviceAccountEmail: string;
    private privateKey: string;
    private client: any;

    constructor() {
        const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
        try {
            const keyPath = path.resolve(keyFile);
            console.log('[SheetsService] Loading credentials from:', keyPath);

            this.client = new google.auth.GoogleAuth({
                keyFilename: keyPath,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const keyContent = fs.readFileSync(keyPath, 'utf8');
            const keys = JSON.parse(keyContent);
            this.serviceAccountEmail = keys.client_email;
            console.log('[SheetsService] Initialized with service account:', this.serviceAccountEmail);
        } catch (error) {
            console.error('[SheetsService] Failed to load credentials:', error.message);
        }
    }

    async addSheet(spreadsheetId: string, title: string): Promise<number | undefined> {
        if (!this.client) return;

        try {
            const sheets = google.sheets({ version: 'v4', auth: this.client });
            const doc = await sheets.spreadsheets.get({ spreadsheetId });
            const existingSheet = doc.data.sheets?.find(s => s.properties?.title === title);

            if (existingSheet) {
                console.log(`[SheetsService] Sheet '${title}' already exists.`);
                return existingSheet.properties?.sheetId;
            }

            const response = await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: { title },
                        },
                    }],
                },
            });

            const newSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
            console.log(`[SheetsService] Created new sheet: ${title} (ID: ${newSheetId})`);

            // Add header row
            await this.appendRow(spreadsheetId, title, [
                'Kayıt Tarihi', 'Kayıt Saati', 'Proje', 'Plaka', 'Malzeme', 'Miktar', 'Birim', 'Tedarikçi', 'Fiş No', 'İrsaliye Tarihi', 'Kayıt Tarihi (Tam)', 'Fotoğraf', 'Notlar',
            ]);

            return newSheetId;
        } catch (error) {
            console.error(`[SheetsService] Failed to add sheet '${title}':`, error.message);
        }
    }

    async appendRow(spreadsheetId: string, sheetTitle: string, rowData: any[]): Promise<void> {
        if (!this.client) return;

        try {
            await this.tryAppend(spreadsheetId, sheetTitle, rowData);
            console.log(`[SheetsService] Appended row to ${spreadsheetId} -> ${sheetTitle}`);
        } catch (error) {
            // If sheet is missing, try creating it and appending again
            if (error.message && (error.message.includes('Unable to parse range') || error.message.includes('find the sheet'))) {
                console.log(`[SheetsService] Sheet '${sheetTitle}' not found. Creating it...`);
                try {
                    await this.addSheet(spreadsheetId, sheetTitle);
                    await this.tryAppend(spreadsheetId, sheetTitle, rowData);
                    console.log(`[SheetsService] Created sheet and appended row to ${sheetTitle}`);
                    return;
                } catch (createError) {
                    console.error(`[SheetsService] Failed to create sheet '${sheetTitle}' and append:`, createError.message);
                }
            }
            console.error('[SheetsService] Failed to append row:', error.message);
        }
    }

    private async tryAppend(spreadsheetId: string, sheetTitle: string, rowData: any[]) {
        const sheets = google.sheets({ version: 'v4', auth: this.client });
        const range = `'${sheetTitle}'!A:M`;

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [rowData],
            },
        });
    }
}

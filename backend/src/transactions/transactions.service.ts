import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialTransaction } from './transaction.entity';
import { SheetsService } from '../sheets/sheets.service';
import { OCRService } from '../ocr/ocr.service';
import { ProjectsService } from '../projects/projects.service';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
    constructor(
        @InjectRepository(MaterialTransaction)
        private readonly repo: Repository<MaterialTransaction>,
        private readonly sheetsService: SheetsService,
        private readonly ocrService: OCRService,
        private readonly projectsService: ProjectsService,
        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,
    ) { }

    async createTransaction(body: CreateTransactionDto, file?: Express.Multer.File): Promise<MaterialTransaction> {
        let photoUrl = '';
        let uploadId: string;
        let ocrData: any = null;

        // Resolve project_name → project_id if needed
        let projectId = body.project_id;
        const projectName = body.project_name || '';

        if (!projectId && projectName) {
            // Mobile sends project name, try to find or create project
            const projects = await this.projectsService.findAll();
            const found = projects.find(p =>
                p.name?.toLowerCase() === projectName.toLowerCase() ||
                p.code?.toLowerCase() === projectName.toLowerCase()
            );
            if (found) {
                projectId = found.id;
            } else {
                // Auto-create the project
                const newProject = await this.projectsService.create({
                    code: projectName.replace(/\s+/g, '-').toUpperCase(),
                    name: projectName,
                    city: '-',
                    district: '-',
                    gps_lat: 0,
                    gps_lng: 0,
                });
                projectId = newProject.id;
                console.log(`[TransactionsService] Auto-created project: ${projectName} → ${projectId}`);
            }
        }

        if (file) {
            // 1. Upload Photo
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const safePlate = (body.plate_number || 'NoPlate').replace(/\s+/g, '').toUpperCase();
            const safeMaterial = (body.material_type || 'Material').replace(/\s+/g, '-').toUpperCase();
            const fileName = `${dateStr}/${dateStr}-${safeMaterial}-${safePlate}.jpg`;

            const uploadResult = await this.storageService.upload(file.buffer, fileName, 'image/jpeg');
            photoUrl = uploadResult.url;
            uploadId = uploadResult.key;

            // 2. OCR Processing (auto-fill empty fields)
            try {
                console.log('[TransactionsService] Starting OCR processing...');
                const ocrResult = await this.ocrService.extractText(file.buffer);
                console.log('[TransactionsService] OCR Result:', { confidence: ocrResult.confidence, extractedData: ocrResult.data });

                const correctedData = this.ocrService.validateAndCorrect(ocrResult.data);

                ocrData = {
                    rawText: ocrResult.text,
                    confidence: ocrResult.confidence,
                    extracted: correctedData,
                };

                // Auto-fill empty fields from OCR
                if (!body.plate_number && correctedData.plateNumber) {
                    body.plate_number = correctedData.plateNumber;
                }
                if (!body.material_type && correctedData.materialType) {
                    body.material_type = correctedData.materialType;
                }
                if (!body.quantity && correctedData.quantity) {
                    body.quantity = parseFloat(correctedData.quantity);
                }
                if (!body.unit && correctedData.unit) {
                    body.unit = correctedData.unit;
                }
                if (!body.supplier_name && correctedData.supplierName) {
                    body.supplier_name = correctedData.supplierName;
                }
                if (!body.ticket_number && correctedData.ticketNumber) {
                    body.ticket_number = correctedData.ticketNumber;
                }
            } catch (error) {
                console.error('[TransactionsService] OCR processing failed:', error.message || error);
                ocrData = { error: error.message || 'OCR failed' };
            }
        }

        // 3. Duplicate Check - same ticket + plate = same receipt
        if (body.ticket_number && body.plate_number) {
            const existing = await this.repo.findOne({
                where: {
                    ticket_number: body.ticket_number,
                    plate_number: body.plate_number,
                }
            });
            if (existing) {
                console.log(`[TransactionsService] Duplicate detected: ticket=${body.ticket_number}, plate=${body.plate_number}`);
                throw new ConflictException(`Bu irsaliye zaten kaydedilmiş (Fiş: ${body.ticket_number}, Plaka: ${body.plate_number})`);
            }
        }

        // 4. Save to DB
        const tx = this.repo.create({
            project_id: projectId || projectName || 'UNKNOWN',
            type: body.type || 'IN',
            material_type: body.material_type,
            quantity: typeof body.quantity === 'string' ? parseFloat(body.quantity as any) : body.quantity,
            unit: body.unit || 'TON',
            plate_number: body.plate_number,
            supplier_name: body.supplier_name,
            ticket_number: body.ticket_number,
            notes: body.notes,
            photo_id: uploadId,
            ocr_data: ocrData,
            transaction_date: body.transaction_date ? new Date(body.transaction_date) : new Date(),
        });

        const saved = await this.repo.save(tx);

        // 4. Sync to Google Sheets (async, non-blocking)
        this.syncToSheets(saved, projectName, photoUrl).catch(e => {
            console.error('Sheets sync background error:', e.message);
        });

        return saved;
    }

    private async syncToSheets(saved: MaterialTransaction, projectName: string, photoUrl: string) {
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (!spreadsheetId) return;

        try {
            let sheetTitle = projectName || 'Genel';

            // Try to resolve project name from ID
            if (!projectName && saved.project_id) {
                try {
                    const project = await this.projectsService.findOne(saved.project_id);
                    if (project) sheetTitle = project.name;
                } catch { }
            }

            const txDate = saved.transaction_date || saved.created_at || new Date();
            const dateVal = txDate instanceof Date ? txDate : new Date(txDate);
            const datePart = dateVal.toISOString().split('T')[0];
            const timePart = dateVal.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            const row = [
                datePart,
                timePart,
                sheetTitle,
                saved.plate_number || '',
                saved.material_type || '',
                saved.quantity || '',
                saved.unit || '',
                saved.supplier_name || '',
                saved.ticket_number || '',
                saved.notes || photoUrl || '',
            ];

            await this.sheetsService.appendRow(spreadsheetId, sheetTitle, row);
            saved.is_synced_sheets = true;
            saved.sync_error = '';
            await this.repo.save(saved);
            console.log(`[Sheets] Synced to: ${sheetTitle}`);
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'Unknown Sheet Error';
            console.error('[Sheets] Sync failed:', errMsg);
            saved.is_synced_sheets = false;
            saved.sync_error = errMsg;
            await this.repo.save(saved);
        }
    }

    async findAll(projectId?: string): Promise<MaterialTransaction[]> {
        const where = projectId ? { project_id: projectId } : {};
        return this.repo.find({
            where,
            order: { created_at: 'DESC' },
            take: 100,
        });
    }

    async checkDuplicate(ticketNumber: string, plateNumber: string): Promise<boolean> {
        const existing = await this.repo.findOne({
            where: { ticket_number: ticketNumber, plate_number: plateNumber }
        });
        return !!existing;
    }
}

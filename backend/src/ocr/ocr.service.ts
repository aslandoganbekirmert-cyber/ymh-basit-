import { Injectable } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class OCRService {
    private client: ImageAnnotatorClient;
    private usageFile = path.resolve('./vision-usage.json');
    private FREE_TIER_LIMIT = 950;

    async onModuleInit() {
        console.log('[OCRService] Initializing Google Vision API client...');
        let keyPath = path.resolve('./vision-credentials.json');
        if (!fs.existsSync(keyPath)) {
            console.warn('[OCRService] vision-credentials.json not found, falling back to google-credentials.json');
            keyPath = path.resolve('./google-credentials.json');
        }

        if (!fs.existsSync(keyPath)) {
            console.warn('[OCRService] No credentials file found. OCR will not be available.');
            return;
        }

        this.client = new ImageAnnotatorClient({ keyFilename: keyPath });
        console.log(`[OCRService] Google Vision API client ready (using ${path.basename(keyPath)})`);
        this.checkUsageFile();
    }

    async extractText(imageBuffer: Buffer): Promise<{ text: string; confidence: number; data: any }> {
        if (!this.client) {
            throw new Error('OCR not initialized - credentials file missing');
        }

        this.checkAndIncrementUsage();

        try {
            const [result] = await this.client.textDetection(imageBuffer);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                console.log('[OCRService] No text detected');
                return { text: '', confidence: 0, data: {} };
            }

            const fullText = detections[0].description || '';
            let totalConfidence = 0;
            let count = 0;

            for (let i = 1; i < detections.length; i++) {
                if ((detections[i] as any).confidence) {
                    totalConfidence += (detections[i] as any).confidence;
                    count++;
                }
            }

            const confidence = count > 0 ? Math.round((totalConfidence / count) * 100) : 0;
            console.log('[OCRService] Raw OCR text:', fullText);

            const extractedData = this.parseWaybillData(fullText);
            const validatedData = this.validateAndCorrect(extractedData);

            return {
                text: fullText,
                confidence,
                data: validatedData,
            };
        } catch (error) {
            console.error('[OCRService] OCR failed:', error);
            if (error.message?.includes('Limit Reached')) {
                throw new Error('Google Vision API Monthly Limit Reached!');
            }
            throw new Error('OCR processing failed');
        }
    }

    private checkUsageFile() {
        if (!fs.existsSync(this.usageFile)) {
            const initialData = { month: this.getCurrentMonth(), count: 0 };
            fs.writeFileSync(this.usageFile, JSON.stringify(initialData, null, 2));
        }
    }

    private getCurrentMonth(): string {
        const date = new Date();
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    private checkAndIncrementUsage() {
        try {
            this.checkUsageFile();
            const data = JSON.parse(fs.readFileSync(this.usageFile, 'utf8'));
            const currentMonth = this.getCurrentMonth();

            if (data.month !== currentMonth) {
                data.month = currentMonth;
                data.count = 0;
            }

            if (data.count >= this.FREE_TIER_LIMIT) {
                throw new Error(`FREE TIER LIMIT EXCEEDED! Usage: ${data.count}/${this.FREE_TIER_LIMIT}`);
            }

            data.count++;
            fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2));
            console.log(`[OCRService] API Request Count for ${currentMonth}: ${data.count}`);
        } catch (error) {
            console.error('[OCRService] Usage tracking error:', error.message);
            if (error.message.includes('LIMIT EXCEEDED')) throw error;
        }
    }

    parseWaybillData(text: string): any {
        const data: any = {};
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // === PLAKA TESPİTİ ===
        // 1. "Araç plaka numarası:35HE0075" pattern (e-İrsaliye)
        const plakaFromArac = text.match(/[Aa]ra[cç]\s*plaka\s*(?:numaras[ıi])?\s*[:\s]*([0-9]{2}\s*[A-ZÇĞİÖŞÜ]{1,5}\s*[0-9]{2,5})/i);
        // 2. "PLAKA:" or "Plaka No" pattern
        const plakaFromLabel = text.match(/(?:PLAKA|Plaka\s*No)\s*[\.:\s]*([0-9]{2}\s*[A-ZÇĞİÖŞÜ]{1,5}\s*[0-9]{2,5})/i);
        // 3. Standalone Turkish plate pattern (fallback)
        const plakaStandalone = text.match(/\b([0-9]{2}[A-Z]{1,3}[0-9]{2,5})\b/);

        const plateMatch = plakaFromArac || plakaFromLabel || plakaStandalone;
        if (plateMatch) {
            let raw = plateMatch[1].replace(/\s+/g, '').toUpperCase();
            const stdMatch = raw.match(/^(\d{2})([A-ZÇĞİÖŞÜ]+)(\d+)$/);
            if (stdMatch) {
                data.plateNumber = `${stdMatch[1]} ${stdMatch[2]} ${stdMatch[3]}`;
            } else {
                data.plateNumber = raw;
            }
        }

        // === FİRMA / TEDARİKÇİ TESPİTİ ===
        // Priority 1: Kantar fişi section — find the company name line
        const kantarStart = lines.findIndex(l => /KANTAR\s*F[İI]Ş?[İI]?\b/i.test(l));
        if (kantarStart >= 0) {
            for (let i = kantarStart + 1; i < lines.length; i++) {
                const line = lines[i];
                if (/(A\.?\s*Ş|LTD|SAN\.|LOJİSTİK|LOJISTIK|İNŞAAT|INSAAT|MADEN|TİC\.|TICARET|SANAYI|KUMLAMA|BETON|HAZIR|TAŞIMACILIK|TASIMA|NAKLİYAT|NAKLIYAT|HAFRIYAT|YAPI|MERMER|AGREGA|KÖMÜR|KOMUR|AKARYAKIT)/i.test(line)
                    && line.length > 5) {
                    data.supplierName = line.replace(/^\d+[\s\-\.]+/, '').trim();
                    break;
                }
            }
        }

        // Priority 2: "Firma Adı:" with inline value
        if (!data.supplierName) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const nextLine = lines[i + 1] || '';
                if (/(F[İI]RMA\s*AD[IİI])/i.test(line)) {
                    // Try splitting by colon, dots, or comma
                    const afterDelim = line.split(/[:\.,]+/).slice(1).join(':').trim();
                    if (afterDelim.length > 2) {
                        data.supplierName = afterDelim.replace(/^\d+[\s\-\.]+/, '').trim();
                    } else if (nextLine.length > 2 && !/(GİTTİĞİ|GITTIGI|MALZEME|İRSALİYE|BRÜT|DARA|NET|PLAKA)/i.test(nextLine)) {
                        data.supplierName = nextLine.replace(/^\d+[\s\-\.]+/, '').trim();
                    }
                    break;
                }
            }
        }

        // Priority 3: Numbered company format "24-LIDER KUMLAMA" near Firma Adı
        if (!data.supplierName) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = line.match(/^\d+[\s\-]+(.{3,})/);
                if (match && /(KUMLAMA|BETON|HAZIR|LOJİSTİK|LOJISTIK|İNŞAAT|INSAAT|MADEN|NAKLİYAT|NAKLIYAT|HAFRIYAT|YAPI|SAN|LTD|TİC|SANAYI|MERMER|AGREGA)/i.test(match[1])) {
                    data.supplierName = match[1].trim();
                    break;
                }
            }
        }

        // Priority 4: "SAYIN" block company name (e-İrsaliye recipient)
        if (!data.supplierName) {
            const sayinIdx = lines.findIndex(l => /^SAYIN$/i.test(l));
            if (sayinIdx >= 0 && lines[sayinIdx + 1]) {
                data.supplierName = lines[sayinIdx + 1].trim();
            }
        }

        // === MALZEME TESPİTİ ===
        // e-İrsaliye: "Mal" column → value on next line (e.g. "BYPASS")
        // Kantar fişi: "Malzeme Adı" line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = lines[i + 1] || '';

            // "Mal" column header in e-İrsaliye table (standalone "Mal" word)
            if (/^Mal$/i.test(line) && nextLine) {
                data.materialType = nextLine.trim();
                break;
            }

            // "Malzeme Adı:" pattern - numbered format "9- MUHTELİF MALZEME"
            if (/Malzeme\s*Ad[ıi]/i.test(line)) {
                const afterColon = line.split(/[:\.]/).filter(p => p.trim().length > 0);
                const val = afterColon[afterColon.length - 1]?.trim();
                if (val && val.length > 1 && !/Malzeme/i.test(val) && !/[İI]rsal[İIi]ye/i.test(val)) {
                    data.materialType = val.replace(/^\d+[\s\-\.]+/, '').trim();
                } else {
                    // Look at next lines, skip İrsaliye/header lines
                    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                        const candidate = lines[j];
                        if (candidate.length > 1
                            && !/[İI]rsal[İIi]ye/i.test(candidate)
                            && !/(GİRİŞ|GIRIS|ÇIKIŞ|CIKIS|PLAKA|BRÜT|DARA|NET|FİRMA|FIRMA)/i.test(candidate)) {
                            data.materialType = candidate.replace(/^\d+[\s\-\.]+/, '').trim();
                            break;
                        }
                    }
                }
                break;
            }
        }

        // Fallback: search for numbered material format "9- MUHTELIF MALZEME"
        if (!data.materialType) {
            for (const line of lines) {
                const match = line.match(/^\d+[\s\-]+\s*(MUHTEL[İI]F|BYPASS|AGREGA|KUM|ÇAKIL|BETON|TOPRAK|KÖMÜR|KOMUR|MICIR|MICIR|STABILIZE|ASFALT|FİLLER|FILLER)/i);
                if (match) {
                    data.materialType = line.replace(/^\d+[\s\-\.]+/, '').trim();
                    break;
                }
            }
        }

        // === FİŞ / TARTIM NO TESPİTİ ===
        // "TARTIM NO:" or "KANTAR FİŞİ NO:" or "İrsaliye No" 
        const tartimMatch = text.match(/(?:TART[IİI]M\s*NO|KANTAR\s*F[İI]Ş[İI]\s*NO)\s*[:\s]*(\d+)/i);
        const fisMatch = text.match(/(?:F[İI]Ş|FIS)\s*(?:NO)?\s*[:\s]*(\d+)/i);
        if (tartimMatch) {
            data.ticketNumber = tartimMatch[1];
        } else if (fisMatch) {
            data.ticketNumber = fisMatch[1];
        }

        // === MİKTAR TESPİTİ ===
        // Priority: NET > 1.Tartı > Miktar > generic
        const quantityPatterns = [
            // NET weight (most accurate in kantar fişi with BRÜT/DARA/NET)
            /NET\s*[\.:]*\s*([0-9\.\,]+)\s*(?:Kg|KG|Ton|TON)/i,
            // "29480.00 KG" format (standalone number with unit)
            /\bNET\b[:\s]*\n?\s*([0-9\.\,]+)\s*\n?\s*(?:Kg|KG|Ton|TON)/i,
            // 1.Tartı pattern
            /(?:1\.\s*Tart[ıi]?|Tart[ıi]?)\s*[\.:]*\s*([0-9\.\,]+)\s*(?:Kg|KG|Ton|TON)/i,
            // Miktar column (e-İrsaliye)
            /Miktar\s*\n?\s*([0-9\.\,]+)\s*(?:Kg|KG|Ton|TON)/i,
            /(?:MİKTAR|MIKTAR|QUANTITY|AGIRLIK)\s*[\.:]*\s*([0-9\.\,]+)\s*(TON|M3|M³|METRE|LİTRE|ADET|KG|Kg|kg)?/i,
            /([0-9\.\,]+)\s+(Kg|KG|Ton|TON)/i,
        ];
        for (const pattern of quantityPatterns) {
            const match = text.match(pattern);
            if (match) {
                let rawQty = match[1];
                let unit = (match[2] || 'KG').toUpperCase();

                if (rawQty === '.' || rawQty === ',') continue;

                // Handle Turkish number format: dot or comma as thousands separator
                // "47.100" or "47,100" in Turkish = 47100 (not 47.1)
                // If exactly 3 digits after separator → it's a thousands separator
                if (rawQty.includes('.') && !rawQty.includes(',')) {
                    const parts = rawQty.split('.');
                    if (parts.length === 2 && parts[1].length === 3) {
                        rawQty = rawQty.replace('.', '');
                    }
                } else if (rawQty.includes(',') && !rawQty.includes('.')) {
                    const parts = rawQty.split(',');
                    if (parts.length === 2 && parts[1].length === 3) {
                        // Comma as thousands separator: 47,100 = 47100
                        rawQty = rawQty.replace(',', '');
                    } else {
                        // Comma as decimal separator: 47,5 = 47.5
                        rawQty = rawQty.replace(',', '.');
                    }
                }

                // Auto-convert KG to TON if value >= 1000
                let numericQty = parseFloat(rawQty);
                if (!isNaN(numericQty)) {
                    if (unit === 'KG' && numericQty >= 1000) {
                        numericQty = Math.round((numericQty / 1000) * 100) / 100; // Round to 2 decimals
                        unit = 'TON';
                    }
                    rawQty = numericQty.toString();
                }

                data.quantity = rawQty;
                data.unit = unit.replace('M³', 'M3').replace('METREKÜP', 'M3').replace('K8', 'KG');
                break;
            }
        }

        // Tarih tespiti
        const datePatterns = [
            /(?:TARİH|TARIH|DATE|GİRİS|GIRIS)\s*[\.:]*\s*(\d{2})[\s\./-]*(\d{2})[\s\./-]*(\d{4})/i,
            /(\d{2})[\s\./-]+(\d{2})[\s\./-]+(\d{4})/,
        ];
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                let year = match[3].replace(/Z/g, '2').replace(/O/g, '0');
                if (year.startsWith('28')) year = '20' + year.substring(2);
                data.date = `${year}-${match[2]}-${match[1]}`;
                break;
            }
        }

        return data;
    }

    validateAndCorrect(ocrData: any): any {
        const corrected = { ...ocrData };

        if (corrected.quantity) {
            let qty = corrected.quantity.replace(/[^0-9\.,]/g, '');
            if (qty.endsWith('.') || qty.endsWith(',')) qty = qty.slice(0, -1);
            if (!qty || qty === '.' || qty === ',') {
                corrected.quantity = undefined;
            } else {
                corrected.quantity = qty;
            }

            if (corrected.unit === 'ADET' && corrected.quantity && corrected.quantity.includes('.')) {
                const parts = corrected.quantity.split('.');
                if (parts[1] && parts[1].length === 3) {
                    corrected.quantity = corrected.quantity.replace('.', '');
                }
            }
        }

        return corrected;
    }
}

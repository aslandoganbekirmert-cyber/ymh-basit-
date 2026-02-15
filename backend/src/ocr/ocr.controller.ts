import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OCRService } from './ocr.service';

@Controller('ocr')
export class OCRController {
    constructor(private readonly ocrService: OCRService) { }

    @Post('analyze')
    @UseInterceptors(FileInterceptor('file'))
    async analyze(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            return { error: 'No file provided', text: '', confidence: 0, data: {} };
        }

        try {
            const result = await this.ocrService.extractText(file.buffer);
            return {
                success: true,
                text: result.text,
                confidence: result.confidence,
                data: result.data,
            };
        } catch (error) {
            console.error('[OCRController] Analysis failed:', error.message);
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0,
                data: {},
            };
        }
    }
}

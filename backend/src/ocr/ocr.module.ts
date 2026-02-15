import { Global, Module } from '@nestjs/common';
import { OCRService } from './ocr.service';
import { OCRController } from './ocr.controller';

@Global()
@Module({
    controllers: [OCRController],
    providers: [OCRService],
    exports: [OCRService],
})
export class OCRModule { }

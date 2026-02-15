import { Controller, Post, Get, Query, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly service: TransactionsService) { }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async create(@UploadedFile() file: Express.Multer.File, @Body() body: CreateTransactionDto) {
        return this.service.createTransaction(body, file);
    }

    @Get('check-duplicate')
    async checkDuplicate(@Query('ticket') ticket: string, @Query('plate') plate: string) {
        if (!ticket || !plate) return { exists: false };
        const exists = await this.service.checkDuplicate(ticket, plate);
        return { exists };
    }

    @Get()
    findAll(@Query('project_id') projectId?: string) {
        return this.service.findAll(projectId);
    }
}

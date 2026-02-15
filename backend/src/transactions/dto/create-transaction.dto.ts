import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
    @IsOptional()
    @IsString()
    project_id?: string;

    @IsOptional()
    @IsString()
    project_name?: string; // Mobile sends project name, not UUID

    @IsOptional()
    @IsString()
    material_type?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    quantity?: number;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsString()
    plate_number?: string;

    @IsOptional()
    @IsString()
    supplier_name?: string;

    @IsOptional()
    @IsString()
    ticket_number?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    type?: 'IN' | 'OUT';

    @IsOptional()
    transaction_date?: string;
}

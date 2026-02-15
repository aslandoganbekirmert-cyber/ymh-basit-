import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateProjectDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    district?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @IsOptional()
    @IsNumber()
    gps_lng?: number;
}

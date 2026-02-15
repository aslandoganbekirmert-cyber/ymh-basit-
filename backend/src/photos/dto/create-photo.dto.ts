import { IsString, IsOptional } from 'class-validator';

export class CreatePhotoDto {
    @IsString()
    project_id: string;

    @IsString()
    category: string;

    @IsString()
    gps_lat: string;

    @IsString()
    gps_lng: string;

    @IsOptional()
    @IsString()
    gps_accuracy?: string;

    @IsString()
    device_timestamp: string;

    @IsOptional()
    @IsString()
    is_offline_capture?: string;

    @IsOptional()
    @IsString()
    voice_note_text?: string;
}

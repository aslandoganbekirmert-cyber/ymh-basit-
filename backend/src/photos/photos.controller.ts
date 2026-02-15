import { Controller, Post, Get, Query, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Controller('photos')
export class PhotosController {
    constructor(private readonly photosService: PhotosService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() createPhotoDto: CreatePhotoDto) {
        if (!file) throw new Error('File is required');
        return this.photosService.uploadPhoto(file, createPhotoDto);
    }

    @Get()
    async findAll(@Query('project_id') projectId: string) {
        return this.photosService.findAll(projectId);
    }
}

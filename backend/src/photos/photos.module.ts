import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldPhoto } from './field-photo.entity';
import { Project } from '../projects/project.entity';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';

@Module({
    imports: [TypeOrmModule.forFeature([FieldPhoto, Project])],
    controllers: [PhotosController],
    providers: [PhotosService],
})
export class PhotosModule { }

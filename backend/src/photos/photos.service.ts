import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { FieldPhoto } from './field-photo.entity';
import { Project } from '../projects/project.entity';
import * as crypto from 'crypto';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

@Injectable()
export class PhotosService {
    constructor(
        @InjectRepository(FieldPhoto)
        private readonly photosRepository: Repository<FieldPhoto>,
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,
        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,
    ) { }

    async uploadPhoto(file: Express.Multer.File, dto: any) {
        const hashSum = crypto.createHash('sha256');
        hashSum.update(file.buffer);
        const hexHash = hashSum.digest('hex');
        const fileName = `${hexHash}.jpg`;

        const uploadResult = await this.storageService.upload(file.buffer, fileName, 'image/jpeg');

        let projectId = dto.project_id;
        if (!projectId || projectId === 'null') {
            const unassigned = await this.projectsRepository.findOneBy({ code: '0000' });
            if (unassigned) {
                projectId = unassigned.id;
            } else {
                console.error('[Photos] Critical: Unassigned project (0000) not found in DB!');
            }
        }

        const sequenceId = await this.determineSequenceGroup(
            projectId,
            parseFloat(dto.gps_lat),
            parseFloat(dto.gps_lng),
            new Date(dto.device_timestamp),
        );

        const photo = this.photosRepository.create({
            project_id: projectId,
            category: dto.category,
            gps_lat: parseFloat(dto.gps_lat),
            gps_lng: parseFloat(dto.gps_lng),
            gps_accuracy: dto.gps_accuracy ? parseFloat(dto.gps_accuracy) : null,
            device_timestamp: new Date(dto.device_timestamp),
            is_offline_capture: dto.is_offline_capture === 'true',
            voice_note_text: dto.voice_note_text,
            sequence_group_id: sequenceId,
            sha256_hash: hexHash,
            s3_key: uploadResult.key,
            bucket: uploadResult.bucket,
            server_timestamp: new Date(),
        });

        return this.photosRepository.save(photo);
    }

    async findAll(projectId: string) {
        return this.photosRepository.find({
            where: { project_id: projectId },
            order: { server_timestamp: 'DESC' },
        });
    }

    private async determineSequenceGroup(projectId: string, lat: number, lng: number, deviceTime: Date): Promise<string> {
        const windowStart = new Date(deviceTime.getTime() - 60 * 60 * 1000);

        if (!projectId || !lat || !lng) return crypto.randomUUID();

        const recentPhotos = await this.photosRepository.find({
            where: {
                project_id: projectId,
                server_timestamp: MoreThan(windowStart),
            },
            order: { server_timestamp: 'DESC' },
            take: 5,
        });

        for (const p of recentPhotos) {
            if (!p.sequence_group_id) continue;
            const dist = this.getDist(lat, lng, p.gps_lat, p.gps_lng);
            if (dist < 50) {
                return p.sequence_group_id;
            }
        }

        return crypto.randomUUID();
    }

    private getDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

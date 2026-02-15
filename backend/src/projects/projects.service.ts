import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { SheetsService } from '../sheets/sheets.service';

@Injectable()
export class ProjectsService {
    constructor(
        @InjectRepository(Project)
        private readonly projectsRepository: Repository<Project>,
        private readonly sheetsService: SheetsService,
    ) { }

    findAll() {
        return this.projectsRepository.find({ order: { created_at: 'DESC' } });
    }

    findOne(id: string) {
        return this.projectsRepository.findOneBy({ id });
    }

    async create(createProjectDto: any) {
        const project = this.projectsRepository.create(createProjectDto);
        const saved = await this.projectsRepository.save(project);
        const savedProject = Array.isArray(saved) ? saved[0] : saved;

        const sheetId = process.env.GOOGLE_SHEETS_ID;
        if (sheetId && savedProject.name) {
            await this.sheetsService.addSheet(sheetId, savedProject.name);
        }

        return savedProject;
    }

    async findNearest(lat: number, lng: number): Promise<Project | null> {
        const projects = await this.findAll();
        let nearest: Project | null = null;
        let minDistance = Infinity;
        const THRESHOLD_METERS = 2000;

        for (const p of projects) {
            if (!p.gps_lat || !p.gps_lng) continue;
            const dist = this.getDistanceFromLatLonInM(lat, lng, p.gps_lat, p.gps_lng);
            if (dist < minDistance && dist < THRESHOLD_METERS) {
                minDistance = dist;
                nearest = p;
            }
        }

        return nearest;
    }

    private getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}

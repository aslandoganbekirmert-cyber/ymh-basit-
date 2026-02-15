import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Get()
    findAll() {
        return this.projectsService.findAll();
    }

    @Get('nearest')
    async findNearest(@Query('lat') lat: string, @Query('lng') lng: string) {
        if (!lat || !lng) return {};
        const project = await this.projectsService.findNearest(parseFloat(lat), parseFloat(lng));
        return project || {};
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Post()
    create(@Body() createProjectDto: CreateProjectDto) {
        if (!createProjectDto.gps_lat) createProjectDto.gps_lat = 0;
        if (!createProjectDto.gps_lng) createProjectDto.gps_lng = 0;
        return this.projectsService.create(createProjectDto);
    }
}

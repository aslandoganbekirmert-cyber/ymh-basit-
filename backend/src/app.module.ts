import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from './projects/projects.module';
import { PhotosModule } from './photos/photos.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StorageModule } from './storage/storage.module';
import { OCRModule } from './ocr/ocr.module';
import { SheetsModule } from './sheets/sheets.module';
import { Project } from './projects/project.entity';
import { FieldPhoto } from './photos/field-photo.entity';
import { MaterialTransaction } from './transactions/transaction.entity';
import { MaterialType } from './transactions/material-type.entity';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: 'ymh.sqlite',
            entities: [Project, FieldPhoto, MaterialTransaction, MaterialType],
            synchronize: true,
        }),
        ProjectsModule,
        PhotosModule,
        TransactionsModule,
        StorageModule,
        OCRModule,
        SheetsModule,
    ],
})
export class AppModule { }

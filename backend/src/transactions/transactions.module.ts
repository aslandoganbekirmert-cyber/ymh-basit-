import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialTransaction } from './transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MaterialTransaction]),
        ProjectsModule,
    ],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule { }

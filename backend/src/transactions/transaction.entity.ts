import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('material_transactions')
export class MaterialTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    project_id: string;

    @Column({ nullable: true })
    photo_id: string;

    @Column({ length: 50, default: 'IN' })
    type: string;

    @Column({ length: 100, nullable: true })
    material_type: string;

    @Column({ length: 100, nullable: true })
    supplier_name: string;

    @Column({ length: 20, nullable: true })
    plate_number: string;

    @Column({ length: 50, nullable: true })
    ticket_number: string;

    @Column('real', { nullable: true })
    quantity: number;

    @Column({ length: 20, default: 'TON' })
    unit: string;

    @CreateDateColumn()
    created_at: Date;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    transaction_date: Date;

    @Column({ nullable: true })
    notes: string;

    @Column('simple-json', { nullable: true })
    ocr_data: any;

    @Column({ default: false })
    is_ocr_verified: boolean;

    @Column({ default: false })
    is_synced_sheets: boolean;

    @Column({ nullable: true })
    sync_error: string;
}

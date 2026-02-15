import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('field_photos')
export class FieldPhoto {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column()
    project_id: string;

    @Column()
    s3_key: string;

    @Column()
    bucket: string;

    @Column({ length: 64 })
    sha256_hash: string;

    @Column({ length: 50 })
    category: string;

    @Column('real')
    gps_lat: number;

    @Column('real')
    gps_lng: number;

    @Column('real', { nullable: true })
    gps_accuracy: number;

    @Column()
    device_timestamp: Date;

    @CreateDateColumn()
    server_timestamp: Date;

    @Column({ default: false })
    is_offline_capture: boolean;

    @Column({ type: 'integer', default: 0 })
    time_diff_seconds: number;

    @Column({ nullable: true })
    sequence_group_id: string;

    @Column({ type: 'text', nullable: true })
    voice_note_text: string;
}

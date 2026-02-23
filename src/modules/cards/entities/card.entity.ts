import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CardSeries } from './card-series.entity';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'series_id', type: 'uuid' })
  seriesId: string;

  @ManyToOne(() => CardSeries)
  @JoinColumn({ name: 'series_id' })
  series: CardSeries;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  pin: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  password: string;

  @Column({ type: 'enum', enum: ['active', 'used', 'expired', 'revoked'], default: 'active' })
  status: string;

  @Column({ name: 'activated_by', type: 'uuid', nullable: true })
  activatedBy: string;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

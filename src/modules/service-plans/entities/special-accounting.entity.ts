import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServicePlan } from './service-plan.entity';

@Entity('special_accounting')
export class SpecialAccounting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => ServicePlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: ServicePlan;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'ratio_dl', type: 'decimal', precision: 4, scale: 3, default: 1.0 })
  ratioDl: number;

  @Column({ name: 'ratio_ul', type: 'decimal', precision: 4, scale: 3, default: 1.0 })
  ratioUl: number;

  @Column({ name: 'ratio_time', type: 'decimal', precision: 4, scale: 3, default: 1.0 })
  ratioTime: number;

  @Column({ name: 'days_of_week', type: 'smallint', array: true, default: '{0,1,2,3,4,5,6}' })
  daysOfWeek: number[];

  @Column({ name: 'auth_allowed', type: 'boolean', default: true })
  authAllowed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

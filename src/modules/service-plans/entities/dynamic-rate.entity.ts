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

@Entity('dynamic_rates')
export class DynamicRate {
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

  @Column({ name: 'rate_dl', type: 'int', default: 0 })
  rateDl: number;

  @Column({ name: 'rate_ul', type: 'int', default: 0 })
  rateUl: number;

  @Column({ name: 'burst_limit_dl', type: 'int', default: 0 })
  burstLimitDl: number;

  @Column({ name: 'burst_limit_ul', type: 'int', default: 0 })
  burstLimitUl: number;

  @Column({ name: 'burst_thresh_dl', type: 'int', default: 0 })
  burstThreshDl: number;

  @Column({ name: 'burst_thresh_ul', type: 'int', default: 0 })
  burstThreshUl: number;

  @Column({ name: 'burst_time_dl', type: 'int', default: 0 })
  burstTimeDl: number;

  @Column({ name: 'burst_time_ul', type: 'int', default: 0 })
  burstTimeUl: number;

  @Column({ name: 'days_of_week', type: 'smallint', array: true, default: '{0,1,2,3,4,5,6}' })
  daysOfWeek: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

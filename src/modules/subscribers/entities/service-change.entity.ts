import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_changes')
export class ServiceChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'subscriber_id', type: 'uuid' })
  subscriberId: string;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy: string;

  @Column({ name: 'old_plan_id', type: 'uuid', nullable: true })
  oldPlanId: string;

  @Column({ name: 'new_plan_id', type: 'uuid', nullable: true })
  newPlanId: string;

  @Column({ name: 'schedule_date', type: 'date' })
  scheduleDate: Date;

  @Column({ type: 'enum', enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

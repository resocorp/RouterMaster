import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('radacct')
@Index('idx_radacct_active', ['username', 'tenantId'], { where: '"stop_time" IS NULL' })
export class Radacct {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId: string;

  @Column({ name: 'unique_id', type: 'varchar', length: 64, nullable: true })
  uniqueId: string;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  subscriberId: string;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ name: 'nas_id', type: 'uuid', nullable: true })
  nasId: string;

  @Column({ name: 'nas_ip', type: 'inet', nullable: true })
  nasIp: string;

  @Column({ name: 'nas_port_id', type: 'varchar', length: 50, nullable: true })
  nasPortId: string;

  @Column({ name: 'framed_ip', type: 'inet', nullable: true })
  framedIp: string;

  @Column({ name: 'calling_station', type: 'varchar', length: 50, nullable: true })
  callingStation: string;

  @Column({ name: 'called_station', type: 'varchar', length: 50, nullable: true })
  calledStation: string;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ name: 'update_time', type: 'timestamptz', nullable: true })
  updateTime: Date;

  @Column({ name: 'stop_time', type: 'timestamptz', nullable: true })
  stopTime: Date;

  @Column({ name: 'session_time', type: 'int', default: 0 })
  sessionTime: number;

  @Column({ name: 'input_octets', type: 'bigint', default: 0 })
  inputOctets: string;

  @Column({ name: 'output_octets', type: 'bigint', default: 0 })
  outputOctets: string;

  @Column({ name: 'input_gigawords', type: 'int', default: 0 })
  inputGigawords: number;

  @Column({ name: 'output_gigawords', type: 'int', default: 0 })
  outputGigawords: number;

  @Column({ name: 'terminate_cause', type: 'varchar', length: 50, nullable: true })
  terminateCause: string;

  @Column({ name: 'ap_name', type: 'varchar', length: 100, nullable: true })
  apName: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

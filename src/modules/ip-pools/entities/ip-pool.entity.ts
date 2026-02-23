import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('ip_pools')
export class IpPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['radius', 'docsis'], default: 'radius' })
  type: string;

  @Column({ name: 'first_ip', type: 'inet' })
  firstIp: string;

  @Column({ name: 'last_ip', type: 'inet' })
  lastIp: string;

  @Column({ name: 'next_pool_id', type: 'uuid', nullable: true })
  nextPoolId: string;

  @ManyToOne(() => IpPool, { nullable: true })
  @JoinColumn({ name: 'next_pool_id' })
  nextPool: IpPool;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

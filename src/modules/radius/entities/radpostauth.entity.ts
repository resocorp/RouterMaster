import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('radpostauth')
export class Radpostauth {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pass: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reply: string;

  @Column({ name: 'nas_ip', type: 'inet', nullable: true })
  nasIp: string;

  @Column({ name: 'nas_id', type: 'uuid', nullable: true })
  nasId: string;

  @Column({ name: 'calling_station', type: 'varchar', length: 50, nullable: true })
  callingStation: string;

  @Column({ name: 'auth_date', type: 'timestamptz', default: () => 'NOW()' })
  authDate: Date;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
}

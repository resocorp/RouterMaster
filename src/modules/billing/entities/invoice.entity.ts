import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'invoice_number', type: 'int', generated: 'increment' })
  invoiceNumber: number;

  @Column({ name: 'subscriber_id', type: 'uuid', nullable: true })
  subscriberId: string;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string;

  @Column({ type: 'enum', enum: ['cash', 'transfer', 'online', 'internal', 'card'], default: 'cash' })
  type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gateway: string;

  @Column({ name: 'gateway_txn_id', type: 'varchar', length: 255, nullable: true })
  gatewayTxnId: string;

  @Column({ name: 'service_name', type: 'varchar', length: 255, nullable: true })
  serviceName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  amount: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'net_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  netPrice: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 10, scale: 4, default: 0 })
  vatAmount: number;

  @Column({ name: 'gross_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  grossPrice: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'payment_date', type: 'timestamptz', nullable: true })
  paymentDate: Date;

  @Column({ name: 'period_start', type: 'date', nullable: true })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date', nullable: true })
  periodEnd: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

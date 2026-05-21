import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

export enum CustomerSessionStatus {
  CREATED = 'created',
  CONNECTING = 'connecting',
  QR_READY = 'qr_ready',
  READY = 'ready',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
}

@Entity('customer_sessions')
export class CustomerSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'openwa_session_id' })
  openwaSessionId: string;

  @Column({ name: 'display_name', default: '' })
  displayName: string;

  @Column({
    type: 'text',
    default: CustomerSessionStatus.CREATED,
  })
  status: CustomerSessionStatus;

  @Column({ name: 'phone_number', type: 'text', nullable: true })
  phoneNumber: string | null;

  @Column({ name: 'connected_at', type: 'datetime', nullable: true })
  connectedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

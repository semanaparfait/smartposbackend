import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Snapshot of who made a change; kept as JSON so it survives the user being deleted.
export interface AuditActor {
  id: string;
  name?: string;
  email?: string;
  role: string;
}

export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Filled automatically by AuditSubscriber from the authenticated user (null = system/public).
  @Column({ type: 'jsonb', nullable: true })
  createdBy!: AuditActor | null;

  @Column({ type: 'jsonb', nullable: true })
  updatedBy!: AuditActor | null;
}

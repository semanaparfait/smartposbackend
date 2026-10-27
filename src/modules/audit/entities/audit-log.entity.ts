import { AuditActor } from 'src/common/entities/base.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

// Change history for every audited table. Deliberately has no foreign keys so the
// history survives deletion of the record, the user or the company it refers to.
@Entity('audit_logs')
@Index('IDX_audit_logs_company_created', ['companyId', 'createdAt'])
@Index('IDX_audit_logs_entity', ['entityName', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  // Table name, e.g. "products".
  @Column({ name: 'entity_name' })
  entityName!: string;

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId!: string | null;

  // CREATE/DELETE: snapshot of the record. UPDATE: { field: { from, to } }.
  @Column({ type: 'jsonb', nullable: true })
  changes!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  actor!: AuditActor | null;

  @Index('IDX_audit_logs_actor_id')
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;
}

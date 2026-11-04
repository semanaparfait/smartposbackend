import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

export enum InboxKindEnum {
  // "Request installation" on the website.
  INSTALLATION = 'INSTALLATION',
  // "Contact us" on the website.
  CONTACT = 'CONTACT',
  // Someone forgot their password and no email could be sent.
  PASSWORD_HELP = 'PASSWORD_HELP',
}

export enum InboxStatusEnum {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

// Something sent to the SmartPOS team from outside, for the super admin.
@Entity('inbox_items')
@Index('IDX_inbox_items_status', ['status', 'createdAt'])
export class InboxItem extends BaseEntity {
  @Column({ type: 'enum', enum: InboxKindEnum })
  kind!: InboxKindEnum;

  @Column({ type: 'enum', enum: InboxStatusEnum, default: InboxStatusEnum.NEW })
  status!: InboxStatusEnum;

  // Who sent it.
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  // Business name, message topic, or "Password help".
  @Column({ type: 'varchar', length: 160 })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  // The rest of an installation request: type, location, branches, plan, date.
  @Column({ type: 'jsonb', default: () => "'{}'" })
  details!: Record<string, string | number | null>;

  // The super admin's own note.
  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote!: string | null;

  @Column({
    name: 'handled_by_name',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  handledByName!: string | null;

  @Column({ name: 'handled_at', type: 'timestamptz', nullable: true })
  handledAt!: Date | null;
}

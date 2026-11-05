import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

// A phone that may receive SmartPOS notifications for a signed-in person
// (an Expo push token). One person can have several phones.
@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Last time the app said it is still there.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Index('IDX_push_tokens_token', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  token!: string;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  platform!: string;

  @Index('IDX_push_tokens_user')
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_push_tokens_user',
  })
  user!: User;
}

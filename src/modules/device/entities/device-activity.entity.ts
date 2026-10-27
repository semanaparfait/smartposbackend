import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Device } from './device.entity';

@Entity('device_activities')
@Index(['device', 'createdAt'])
export class DeviceActivity extends BaseEntity {
  @ManyToOne(() => Device, (device) => device.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'device_id' })
  device!: Device;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  // Human readable action, e.g. "Checkout cart", "Login", "Logout".
  @Column()
  action!: string;

  @Column({ nullable: true })
  method!: string;

  @Column({ nullable: true })
  path!: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number;
}

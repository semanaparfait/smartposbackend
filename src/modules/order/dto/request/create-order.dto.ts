import { User } from 'src/modules/user/entities/user.entity';

export class CreateOrderDto {
  subtotal!: number;
  tax!: number;
  note?: string;
  user!: User;
}

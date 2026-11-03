import { User } from 'src/modules/user/entities/user.entity';
import { Order } from '../../entities/order.entity';

export class CreateOrderDto {
  subtotal!: number;
  tax!: number;
  note?: string;
  user!: User;
  companyId!: string;
  // Set for delivery orders (see DeliveryService.prepare); its fee joins the total.
  delivery?: Partial<Order>;
}

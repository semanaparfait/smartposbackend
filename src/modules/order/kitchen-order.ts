import { Order } from './entities/order.entity';

// What a kitchen display sees of an order: only the items sent to the kitchen, or
// nothing at all if it has none. `order.items` must include their products.
export function kitchenOrder(order: Order): Order | null {
  const items = (order.items ?? []).filter((i) => i.product?.sendToKitchen);

  return items.length ? { ...order, items } : null;
}

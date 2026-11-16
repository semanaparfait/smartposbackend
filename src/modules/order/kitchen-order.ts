import {
  KitchenStatusEnum,
  Order,
  OrderStatusEnum,
  StationPartStatus,
  StationStatus,
} from './entities/order.entity';

// What a kitchen display sees of an order: only the items sent to the kitchen, or
// nothing at all if it has none. `order.items` must include their products.
// With stations, every station's items are sent along with `stationStatus`, and
// the screen shows its own station's part (a screen can be moved to another
// station at any time, so the server doesn't filter by station).
export function kitchenOrder(order: Order): Order | null {
  const items = (order.items ?? []).filter(
    (i) => i.stationId || i.product?.sendToKitchen,
  );

  return items.length ? { ...order, items } : null;
}

// ---------------------------------------------------------------- stations

type Routed = { id: string; stationId: string | null };

const DONE: StationPartStatus[] = ['READY', 'SERVED'];

export const hasStations = (order: Pick<Order, 'stationStatus'>) =>
  !!order.stationStatus && Object.keys(order.stationStatus).length > 0;

// An open order's status follows its parts: ready once every station is done,
// served once every part was taken out.
export function statusFromParts(parts: StationStatus): OrderStatusEnum {
  const list = Object.values(parts).map((p) => p.status);
  if (list.every((s) => s === 'SERVED')) return OrderStatusEnum.SERVED;
  if (list.every((s) => DONE.includes(s))) return OrderStatusEnum.READY;
  if (list.some((s) => s !== 'PENDING')) return OrderStatusEnum.PREPARING;
  return OrderStatusEnum.PENDING;
}

// A paid delivery whose food isn't ready keeps the kitchen's step.
export function kitchenStatusFromParts(
  parts: StationStatus,
): KitchenStatusEnum | null {
  const list = Object.values(parts).map((p) => p.status);
  if (list.every((s) => DONE.includes(s))) return null;
  if (list.some((s) => s !== 'PENDING')) return KitchenStatusEnum.PREPARING;
  return KitchenStatusEnum.PENDING;
}

// Sets the order's status (or a paid delivery's kitchen step) from its parts.
export function applyParts(order: Order) {
  if (!hasStations(order)) return;
  const parts = order.stationStatus!;
  if (order.status === OrderStatusEnum.COMPLETED) {
    if (order.kitchenStatus)
      order.kitchenStatus = kitchenStatusFromParts(parts);
  } else if (order.status !== OrderStatusEnum.CANCELLED) {
    order.status = statusFromParts(parts);
  }
}

// New items for some stations. A station with nothing yet gets a new part; one
// still working, or ready but not taken out, gets more to make (back in its
// queue); one already served starts again with only the new items, so its
// screen doesn't show the food already taken out.
export function addToParts(
  parts: StationStatus | null,
  added: Routed[],
): StationStatus | null {
  const next: StationStatus = { ...(parts ?? {}) };
  const byStation = new Map<string, string[]>();
  for (const item of added)
    if (item.stationId)
      byStation.set(item.stationId, [
        ...(byStation.get(item.stationId) ?? []),
        item.id,
      ]);

  for (const [stationId, ids] of byStation) {
    const part = parts?.[stationId];
    if (!part) next[stationId] = { status: 'PENDING', items: null };
    else if (part.status === 'SERVED')
      next[stationId] = { status: 'PENDING', items: ids };
    else
      next[stationId] = {
        status: part.status === 'READY' ? 'PENDING' : part.status,
        items: part.items ? [...part.items, ...ids] : null,
      };
  }
  return Object.keys(next).length ? next : null;
}

// An item left the order: its station's part shrinks, and goes away when the
// station has nothing left on the order.
export function removeFromParts(
  parts: StationStatus | null,
  item: Routed,
  remaining: Routed[],
): StationStatus | null {
  if (!parts || !item.stationId || !parts[item.stationId]) return parts;
  const next: StationStatus = { ...parts };
  const part = next[item.stationId];
  if (!remaining.some((i) => i.stationId === item.stationId)) {
    delete next[item.stationId];
  } else if (part.items) {
    const items = part.items.filter((id) => id !== item.id);
    // Everything added since it was served is gone: it is served again.
    next[item.stationId] = items.length
      ? { ...part, items }
      : { status: 'SERVED', items: null };
  }
  return Object.keys(next).length ? next : null;
}

// Every part counts as served: the order was paid with no kitchen step left to
// track (see completeOrder).
export const closeParts = (parts: StationStatus): StationStatus =>
  Object.fromEntries(
    Object.keys(parts).map((id) => [id, { status: 'SERVED', items: null }]),
  );

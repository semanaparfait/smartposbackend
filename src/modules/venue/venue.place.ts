// Finding a table or seat on a saved floor map (no Nest code, so migrations
// can use it too).

// What a seat is called on orders and receipts, by its type on the map.
export const KIND: Record<string, string> = {
  'bar-stool': 'Bar stool',
  armchair: 'Lounge chair',
  booth: 'Booth',
  'high-table': 'High table',
};

// Where a table or seat is on a saved map: its name, what it is and the room
// it stands in. Also used by the migration that fills in older orders.
export function placeInLayout(layout: unknown, tableId: string) {
  type Box = { x: number; y: number; w: number; h: number };
  type MapItem = Box & { id: string; type: string; label?: string };
  type MapFloor = {
    name?: string;
    items?: MapItem[];
    rooms?: (Box & { name?: string })[];
  };
  const floors = (layout as { floors?: MapFloor[] } | null)?.floors ?? [];
  for (const floor of floors) {
    const item = floor.items?.find((i) => i.id === tableId);
    if (!item) continue;
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const room = floor.rooms?.find(
      (r) =>
        r.name && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h,
    );
    return {
      name: (item.label || '').slice(0, 40) || null,
      kind: KIND[item.type] ?? 'Table',
      area:
        (room?.name || (floors.length > 1 ? floor.name : '') || '').slice(
          0,
          80,
        ) || null,
    };
  }
  return null;
}

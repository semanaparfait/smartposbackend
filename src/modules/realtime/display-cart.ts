// What a customer display shows of a cart: names, quantities, selling prices and
// totals only. The same shape is sent by the server (display.cart) and relayed
// from the till (display.preview).
export interface DisplayCart {
  id: string | null;
  items: {
    name: string;
    image: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  total: number;
}

const MAX_ITEMS = 300;

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : null;

const amount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// The till's preview is only relayed, never stored, but it still goes to another
// screen: keep the known fields, bounded, and drop anything else.
export function sanitizeDisplayCart(input: unknown): DisplayCart | null {
  if (!input || typeof input !== 'object') return null;

  const cart = input as Record<string, unknown>;
  if (!Array.isArray(cart.items)) return null;

  const items = cart.items.slice(0, MAX_ITEMS).map((raw: unknown) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<
      string,
      unknown
    >;
    const image = text(item.image, 1000);

    return {
      name: text(item.name, 200) ?? '',
      image: image && /^https?:\/\//.test(image) ? image : null,
      quantity: amount(item.quantity),
      unitPrice: amount(item.unitPrice),
      total: amount(item.total),
    };
  });

  return { id: text(cart.id, 64), items, total: amount(cart.total) };
}

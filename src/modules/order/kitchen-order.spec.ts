import {
  addToParts,
  closeParts,
  kitchenStatusFromParts,
  removeFromParts,
  statusFromParts,
} from './kitchen-order';
import { KitchenStatusEnum, OrderStatusEnum } from './entities/order.entity';

describe('kitchen stations', () => {
  const BAR = 'bar';
  const GRILL = 'grill';

  it('starts one part per station on a new order', () => {
    const parts = addToParts(null, [
      { id: 'i1', stationId: BAR },
      { id: 'i2', stationId: BAR },
      { id: 'i3', stationId: GRILL },
      { id: 'i4', stationId: null },
    ]);
    expect(parts).toEqual({
      [BAR]: { status: 'PENDING', items: null },
      [GRILL]: { status: 'PENDING', items: null },
    });
  });

  it('has no parts when nothing goes to a station', () => {
    expect(addToParts(null, [{ id: 'i1', stationId: null }])).toBeNull();
  });

  it('follows the parts for the order status', () => {
    expect(
      statusFromParts({
        [BAR]: { status: 'READY', items: null },
        [GRILL]: { status: 'PENDING', items: null },
      }),
    ).toBe(OrderStatusEnum.PREPARING);
    expect(
      statusFromParts({
        [BAR]: { status: 'SERVED', items: null },
        [GRILL]: { status: 'READY', items: null },
      }),
    ).toBe(OrderStatusEnum.READY);
    expect(
      statusFromParts({
        [BAR]: { status: 'SERVED', items: null },
        [GRILL]: { status: 'SERVED', items: null },
      }),
    ).toBe(OrderStatusEnum.SERVED);
    expect(
      statusFromParts({
        [BAR]: { status: 'PENDING', items: null },
        [GRILL]: { status: 'PENDING', items: null },
      }),
    ).toBe(OrderStatusEnum.PENDING);
  });

  it('restarts a served part with only the new items', () => {
    const parts = addToParts(
      {
        [BAR]: { status: 'SERVED', items: null },
        [GRILL]: { status: 'PREPARING', items: null },
      },
      [{ id: 'beer2', stationId: BAR }],
    );
    expect(parts![BAR]).toEqual({ status: 'PENDING', items: ['beer2'] });
    expect(parts![GRILL]).toEqual({ status: 'PREPARING', items: null });
  });

  it('puts a ready part back in the queue with everything', () => {
    const parts = addToParts({ [BAR]: { status: 'READY', items: ['beer2'] } }, [
      { id: 'beer3', stationId: BAR },
    ]);
    expect(parts![BAR]).toEqual({
      status: 'PENDING',
      items: ['beer2', 'beer3'],
    });
  });

  it('drops a part when its last item is removed', () => {
    const parts = removeFromParts(
      {
        [BAR]: { status: 'PENDING', items: null },
        [GRILL]: { status: 'PENDING', items: null },
      },
      { id: 'i1', stationId: BAR },
      [{ id: 'i3', stationId: GRILL }],
    );
    expect(parts).toEqual({ [GRILL]: { status: 'PENDING', items: null } });
  });

  it('serves a restarted part again when its new items are removed', () => {
    const parts = removeFromParts(
      { [BAR]: { status: 'PENDING', items: ['beer2'] } },
      { id: 'beer2', stationId: BAR },
      [{ id: 'beer1', stationId: BAR }],
    );
    expect(parts![BAR]).toEqual({ status: 'SERVED', items: null });
  });

  it("keeps a paid delivery's kitchen step until every part is done", () => {
    expect(
      kitchenStatusFromParts({
        [BAR]: { status: 'READY', items: null },
        [GRILL]: { status: 'PENDING', items: null },
      }),
    ).toBe(KitchenStatusEnum.PREPARING);
    expect(
      kitchenStatusFromParts({ [BAR]: { status: 'READY', items: null } }),
    ).toBeNull();
  });

  it('closes every part', () => {
    expect(
      closeParts({ [BAR]: { status: 'PREPARING', items: ['x'] } }),
    ).toEqual({ [BAR]: { status: 'SERVED', items: null } });
  });
});

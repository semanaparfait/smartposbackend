// Everything the server pushes over the socket. Clients connect to the
// `/realtime` namespace (see RealtimeGateway for the handshake).
export const RealtimeEvent = {
  // Orders: sent to whoever may see the order (its employee, the company's
  // owners and employees with orders.view_all, super admins). Payload: the
  // order, same shape as GET /orders/:id.
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',

  // Devices, for owners / devices.manage / super admins.
  // device.requested + device.updated: { device }; device.removed: { id }.
  DEVICE_REQUESTED: 'device.requested',
  DEVICE_UPDATED: 'device.updated',
  DEVICE_REMOVED: 'device.removed',
  // { deviceId, online } when a device's first socket connects or its last
  // one disconnects.
  DEVICE_PRESENCE: 'device.presence',

  // To the device itself (terminal socket and anyone signed in on it):
  // { status } whenever it is approved, rejected, disabled or enabled.
  DEVICE_STATUS: 'device.status',

  // To the signed-in user: { permissions, version } after their role changed.
  PERMISSIONS_CHANGED: 'permissions.changed',
  // To the signed-in user: { reason } right before the server closes the
  // socket. The app should log out.
  SESSION_REVOKED: 'session.revoked',
} as const;

export const Rooms = {
  user: (id: string) => `user:${id}`,
  device: (id: string) => `device:${id}`,
  company: (id: string) => `company:${id}`,
  // Owners and employees with orders.view_all.
  orders: (companyId: string) => `orders:${companyId}`,
  // Owners and employees with devices.manage.
  devices: (companyId: string) => `devices:${companyId}`,
  admin: 'admin',
};

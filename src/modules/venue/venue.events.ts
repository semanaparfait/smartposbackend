// Sent to everyone signed in at the company (except kitchen displays).
export const VenueEvent = {
  // The owner saved the floor map: { version, savedByName }. Refetch GET /venue.
  LAYOUT_SAVED: 'venue.saved',
  // A table changed: the table, same shape as one row of GET /venue/tables.
  TABLE_UPDATED: 'venue.table',
} as const;

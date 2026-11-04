// Extras SmartPOS turns on per company (the super admin decides). The owner
// then sets each one up; a switched-off extra is hidden in the app and refused
// by the API.
export const FEATURES = {
  services: 'Services & bookings',
  delivery: 'Delivery',
  floorMap: 'Floor map & tables',
  kitchen: 'Kitchen screen',
} as const;

export type FeatureKey = keyof typeof FEATURES;
export type CompanyFeatures = Record<FeatureKey, boolean>;

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

// New companies start with none; the super admin turns on what they bought.
export const NO_FEATURES: CompanyFeatures = {
  services: false,
  delivery: false,
  floorMap: false,
  kitchen: false,
};

// Saved values, with any extra added later counted as off.
export const featuresOf = (saved?: Partial<CompanyFeatures> | null) => ({
  ...NO_FEATURES,
  ...(saved ?? {}),
});

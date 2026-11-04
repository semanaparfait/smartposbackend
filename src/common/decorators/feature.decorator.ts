import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from 'src/modules/company/features';

export const FEATURE_KEY = 'feature';

// Owners and employees reach the endpoint only when the super admin turned this
// extra on for their company (checked by RolesGuard).
export const Feature = (feature: FeatureKey) =>
  SetMetadata(FEATURE_KEY, feature);

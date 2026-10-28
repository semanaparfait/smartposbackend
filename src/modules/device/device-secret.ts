import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function newDeviceSecret() {
  return randomBytes(32).toString('hex');
}

// The secret is random and high-entropy, so a fast hash is sufficient.
export function hashDeviceSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function deviceSecretMatches(secret: string, hash?: string | null) {
  if (!hash) return false;

  const a = Buffer.from(hashDeviceSecret(secret), 'hex');
  const b = Buffer.from(hash, 'hex');

  return a.length === b.length && timingSafeEqual(a, b);
}

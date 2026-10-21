import crypto from 'crypto';

const DEVICE_KEY_PREFIX = 'scdev_';

/** Generates a new device API key. Only its hash is ever stored. */
export function generateDeviceKey(): string {
  return DEVICE_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

export function hashDeviceKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

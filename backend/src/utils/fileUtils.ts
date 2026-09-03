import crypto from 'crypto';
import path from 'path';

/**
 * Calculate SHA-256 hash of a buffer.
 * Used for material integrity checking and Raspberry Pi cache validation.
 */
export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate a safe, unique stored filename for uploaded materials.
 * Prevents path traversal and filename collisions.
 *
 * Example: "IoT Unit 3 Notes.pdf" → "iot-unit-3-notes_v2_abc123de.pdf"
 */
export function generateSafeFilename(
  originalName: string,
  version: number
): string {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
  return `${baseName}_v${version}_${uniqueId}${ext}`;
}

/**
 * Sanitize a course code for use in filesystem paths.
 * Prevents path traversal.
 */
export function sanitizePathSegment(segment: string): string {
  return segment
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/\.\./g, '')
    .substring(0, 50);
}

/**
 * Validate that a resolved path stays within the allowed base directory.
 * Critical for preventing path traversal attacks.
 */
export function assertPathWithin(basePath: string, resolvedPath: string): void {
  const normalizedBase = path.resolve(basePath);
  const normalizedResolved = path.resolve(resolvedPath);

  if (!normalizedResolved.startsWith(normalizedBase + path.sep) &&
      normalizedResolved !== normalizedBase) {
    throw new Error(`Path traversal detected: ${resolvedPath}`);
  }
}

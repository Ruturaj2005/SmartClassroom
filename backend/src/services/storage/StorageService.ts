import { Readable } from 'stream';

/**
 * Storage abstraction interface.
 *
 * Current implementation: LocalStorageService (writes to local filesystem).
 * Future: S3StorageService can implement this interface without touching business logic.
 */
export interface StorageService {
  /**
   * Save a file buffer to storage.
   * @param buffer - File content
   * @param relativePath - Path relative to storage root (e.g., "courses/IOT301/2026/file.pdf")
   * @returns The relative path of the saved file
   */
  saveFile(buffer: Buffer, relativePath: string): Promise<string>;

  /**
   * Delete a file from storage.
   * @param relativePath - Path relative to storage root
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Get a readable stream for a file.
   * @param relativePath - Path relative to storage root
   * @returns Readable stream
   */
  getReadStream(relativePath: string): Readable;

  /**
   * Check if a file exists in storage.
   * @param relativePath - Path relative to storage root
   */
  fileExists(relativePath: string): Promise<boolean>;

  /**
   * Get the absolute path to a file (for local storage only).
   * Returns null for cloud storage implementations.
   */
  getAbsolutePath(relativePath: string): string | null;
}

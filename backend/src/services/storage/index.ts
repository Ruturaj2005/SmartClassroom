import { LocalStorageService } from './LocalStorageService';
import { StorageService } from './StorageService';

/**
 * Singleton storage service instance.
 * Swap LocalStorageService → S3StorageService here to change storage backend.
 */
export const storageService: StorageService = new LocalStorageService();

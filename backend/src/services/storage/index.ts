import { LocalStorageService } from './LocalStorageService';
import { R2StorageService } from './R2StorageService';
import { CloudinaryStorageService } from './CloudinaryStorageService';
import { StorageService } from './StorageService';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

/**
 * Storage service factory.
 * Instantiates the appropriate storage implementation based on STORAGE_PROVIDER.
 * - 'r2' | 'cloudflare_r2': Cloudflare R2 object storage (S3 API)
 * - 'cloudinary': Cloudinary media / raw asset cloud storage
 * - 'local': Local disk storage (default)
 */
function createStorageService(): StorageService {
  const provider = (config.storage.provider || 'local').toLowerCase();

  switch (provider) {
    case 'r2':
    case 'cloudflare':
    case 'cloudflare_r2':
      logger.info('Using Cloudflare R2 storage provider');
      return new R2StorageService();

    case 'cloudinary':
      logger.info('Using Cloudinary storage provider');
      return new CloudinaryStorageService();

    case 'local':
    default:
      logger.info('Using Local filesystem storage provider');
      return new LocalStorageService();
  }
}

export const storageService: StorageService = createStorageService();
export { StorageService, LocalStorageService, R2StorageService, CloudinaryStorageService };

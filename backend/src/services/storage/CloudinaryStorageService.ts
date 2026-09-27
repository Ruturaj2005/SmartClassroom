import { v2 as cloudinary } from 'cloudinary';
import https from 'https';
import http from 'http';
import { Readable, PassThrough } from 'stream';
import { StorageService } from './StorageService';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

/**
 * Cloudinary implementation of StorageService.
 *
 * Handles presentations (PPT, PPTX, PDF) uploaded to Cloudinary as 'raw' resources.
 * Provides public CDN URLs and supports streaming downloads.
 */
export class CloudinaryStorageService implements StorageService {
  private readonly folder: string;

  constructor() {
    const { cloudName, apiKey, apiSecret, folder } = config.storage.cloudinary;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn(
        'Cloudinary credentials incomplete. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.'
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.folder = folder || 'smartclass/materials';
  }

  private sanitizePublicId(relativePath: string): string {
    return relativePath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\.[^/.]+$/, ''); // Strip extension as Cloudinary appends or manages format
  }

  async saveFile(buffer: Buffer, relativePath: string, _mimeType?: string): Promise<string> {
    const publicId = this.sanitizePublicId(relativePath);

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: this.folder,
          public_id: publicId,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error', { error, relativePath });
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty result'));
          }

          logger.info('File saved to Cloudinary', {
            publicId: result.public_id,
            secureUrl: result.secure_url,
          });
          resolve(result.secure_url);
        }
      );

      const passThrough = new PassThrough();
      passThrough.end(buffer);
      passThrough.pipe(uploadStream);
    });
  }

  async deleteFile(relativePath: string): Promise<void> {
    const publicId = `${this.folder}/${this.sanitizePublicId(relativePath)}`;

    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'raw' },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary delete error', { error, publicId });
            return reject(error);
          }
          logger.info('File deleted from Cloudinary', { publicId, result });
          resolve();
        }
      );
    });
  }

  async getReadStream(relativePath: string): Promise<Readable> {
    const fileUrl = await this.getFileUrl(relativePath);
    const client = fileUrl.startsWith('https') ? https : http;

    return new Promise<Readable>((resolve, reject) => {
      client
        .get(fileUrl, (response) => {
          if (response.statusCode && response.statusCode >= 400) {
            return reject(
              Object.assign(new Error(`Failed to fetch file from Cloudinary: ${response.statusCode}`), {
                statusCode: 404,
                code: 'FILE_NOT_FOUND',
              })
            );
          }
          resolve(response);
        })
        .on('error', (err) => reject(err));
    });
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const publicId = `${this.folder}/${this.sanitizePublicId(relativePath)}`;
    try {
      const result = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      return !!result;
    } catch {
      return false;
    }
  }

  getAbsolutePath(_relativePath: string): string | null {
    return null;
  }

  async getFileUrl(relativePath: string): Promise<string> {
    // If the relativePath is already a full Cloudinary URL, return it directly
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }

    const publicId = `${this.folder}/${this.sanitizePublicId(relativePath)}`;
    return cloudinary.url(publicId, { resource_type: 'raw', secure: true });
  }
}

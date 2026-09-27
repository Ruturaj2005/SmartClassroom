import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { StorageService } from './StorageService';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

/**
 * Cloudflare R2 implementation of StorageService.
 *
 * Cloudflare R2 is an S3-compatible cloud object storage service with zero egress fees.
 * It stores presentations (PDF, PPT, PPTX) securely in the cloud and provides both
 * backend streaming and direct CDN/presigned URLs.
 */
export class R2StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;

  constructor() {
    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = config.storage.r2;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      logger.warn(
        'Cloudflare R2 credentials are incomplete. Please configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.'
      );
    }

    this.bucket = bucketName || 'smartclass-materials';
    this.publicUrl = publicUrl ? publicUrl.replace(/\/$/, '') : undefined;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  private normalizeKey(relativePath: string): string {
    return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  async saveFile(buffer: Buffer, relativePath: string, mimeType?: string): Promise<string> {
    const key = this.normalizeKey(relativePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );

    logger.info('File saved to Cloudflare R2', { bucket: this.bucket, key, size: buffer.length });
    return key;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const key = this.normalizeKey(relativePath);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    logger.info('File deleted from Cloudflare R2', { bucket: this.bucket, key });
  }

  async getReadStream(relativePath: string): Promise<Readable> {
    const key = this.normalizeKey(relativePath);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw Object.assign(new Error('File body empty in R2'), {
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
        });
      }

      return response.Body as Readable;
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw Object.assign(new Error('File not found in R2'), {
          statusCode: 404,
          code: 'FILE_NOT_FOUND',
        });
      }
      throw err;
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const key = this.normalizeKey(relativePath);
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      return false;
    }
  }

  getAbsolutePath(_relativePath: string): string | null {
    return null; // Cloud storage does not have a local filesystem path
  }

  async getFileUrl(relativePath: string): Promise<string> {
    const key = this.normalizeKey(relativePath);

    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }

    // Generate a 1-hour presigned URL for private buckets
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { StorageService } from './StorageService';
import { config } from '../../config/config';
import { assertPathWithin } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

/**
 * Local filesystem implementation of StorageService.
 *
 * Files are stored under config.storage.uploadDir (e.g., backend/uploads/).
 * Structure: uploads/courses/{courseCode}/{year}/{filename}
 *
 * To switch to S3, implement StorageService with the AWS SDK and
 * replace the injection in storage/index.ts — zero changes to business logic.
 */
export class LocalStorageService implements StorageService {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? config.storage.uploadDir;
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      logger.info('Storage base directory created', { path: this.baseDir });
    }
  }

  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.baseDir, relativePath);
    assertPathWithin(this.baseDir, resolved);
    return resolved;
  }

  async saveFile(buffer: Buffer, relativePath: string): Promise<string> {
    const absolutePath = this.resolvePath(relativePath);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(absolutePath, buffer);
    logger.info('File saved', { relativePath, size: buffer.length });
    return relativePath;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.resolvePath(relativePath);

    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
      logger.info('File deleted', { relativePath });
    } else {
      logger.warn('File not found during delete', { relativePath });
    }
  }

  getReadStream(relativePath: string): Readable {
    const absolutePath = this.resolvePath(relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw Object.assign(new Error('File not found'), {
        statusCode: 404,
        code: 'FILE_NOT_FOUND',
      });
    }

    return fs.createReadStream(absolutePath);
  }

  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(relativePath);
      return fs.existsSync(absolutePath);
    } catch {
      return false;
    }
  }

  getAbsolutePath(relativePath: string): string | null {
    return this.resolvePath(relativePath);
  }
}

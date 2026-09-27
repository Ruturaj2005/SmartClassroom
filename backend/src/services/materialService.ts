import path from 'path';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { storageService } from './storage';
import { calculateSHA256, generateSafeFilename, sanitizePathSegment } from '../utils/fileUtils';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx'];

export interface UploadMaterialInput {
  courseId: string;
  title: string;
  description?: string;
  uploadedById: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

export class MaterialService {
  /**
   * Validate file type against both MIME type and file extension.
   * Never trust client-provided type alone.
   */
  private validateFileType(mimetype: string, originalname: string): void {
    const ext = path.extname(originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw createError(
        400,
        'INVALID_FILE_TYPE',
        `File extension not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      throw createError(
        400,
        'INVALID_FILE_TYPE',
        `MIME type not allowed. Allowed: PDF, PPT, PPTX`
      );
    }
  }

  async list(courseId?: string, uploadedById?: string) {
    return prisma.material.findMany({
      where: {
        isActive: true,
        ...(courseId && { courseId }),
        ...(uploadedById && { uploadedById }),
      },
      include: {
        course: { select: { courseCode: true, courseName: true } },
        uploadedBy: { select: { email: true, faculty: { select: { name: true } } } },
      },
      orderBy: [{ courseId: 'asc' }, { version: 'desc' }],
    });
  }

  async get(id: string) {
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        course: { select: { courseCode: true, courseName: true } },
        uploadedBy: { select: { email: true, faculty: { select: { name: true } } } },
      },
    });

    if (!material) throw createError(404, 'NOT_FOUND', 'Material not found');
    return material;
  }

  async upload(input: UploadMaterialInput) {
    // 1. Validate course exists
    const course = await prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');

    // 2. Validate file type (MIME + extension)
    this.validateFileType(input.file.mimetype, input.file.originalname);

    // 3. Determine version number
    const latestVersion = await prisma.material.findFirst({
      where: { courseId: input.courseId, title: input.title },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const version = latestVersion ? latestVersion.version + 1 : 1;

    // 4. Calculate SHA-256 hash
    const fileHash = calculateSHA256(input.file.buffer);

    // 5. Generate safe stored filename
    const storedFileName = generateSafeFilename(input.file.originalname, version);

    // 6. Build storage path: courses/{courseCode}/{year}/{filename}
    const year = new Date().getFullYear().toString();
    const safeCode = sanitizePathSegment(course.courseCode);
    const relativePath = path.posix.join(
      'courses',
      safeCode,
      year,
      storedFileName
    );

    // 7. Save file to storage (local, Cloudflare R2, or Cloudinary)
    await storageService.saveFile(input.file.buffer, relativePath, input.file.mimetype);

    // 8. Obtain direct cloud URL if available
    const fileUrl = typeof storageService.getFileUrl === 'function'
      ? await storageService.getFileUrl(relativePath)
      : null;
    const storageProvider = (config.storage.provider || 'local').toLowerCase();

    // 9. Save metadata to database
    const material = await prisma.material.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        description: input.description,
        originalFileName: input.file.originalname,
        storedFileName,
        relativePath,
        fileUrl: fileUrl || null,
        storageProvider,
        mimeType: input.file.mimetype,
        fileSize: input.file.size,
        version,
        fileHash,
        uploadedById: input.uploadedById,
      },
      include: {
        course: { select: { courseCode: true, courseName: true } },
        uploadedBy: { select: { email: true, faculty: { select: { name: true } } } },
      },
    });

    logger.info('Material uploaded', {
      id: material.id,
      courseCode: course.courseCode,
      version,
      fileHash,
      size: input.file.size,
      storageProvider,
      hasCloudUrl: !!fileUrl,
    });

    return material;
  }

  async download(id: string) {
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material || !material.isActive) {
      throw createError(404, 'NOT_FOUND', 'Material not found');
    }

    const fileExists = await storageService.fileExists(material.relativePath);
    if (!fileExists) {
      throw createError(404, 'FILE_NOT_FOUND', 'Physical file not found in storage');
    }

    const stream = await storageService.getReadStream(material.relativePath);
    return { stream, material };
  }

  async deactivate(id: string, requesterId: string, requesterRole: string) {
    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) throw createError(404, 'NOT_FOUND', 'Material not found');

    // Faculty can only deactivate their own materials
    if (requesterRole !== 'ADMIN' && material.uploadedById !== requesterId) {
      throw createError(403, 'FORBIDDEN', 'You can only delete your own materials');
    }

    await prisma.material.update({ where: { id }, data: { isActive: false } });
    logger.info('Material deactivated', { id, requesterId });
  }
}

export const materialService = new MaterialService();

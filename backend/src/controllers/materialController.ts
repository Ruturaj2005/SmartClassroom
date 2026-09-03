import { Request, Response, NextFunction } from 'express';
import { materialService } from '../services/materialService';
import { sendError, sendSuccess } from '../utils/response';

export const listMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.query as Record<string, string>;
    const uploadedById = req.user!.role === 'FACULTY' ? req.user!.id : undefined;
    const materials = await materialService.list(courseId, req.user!.role === 'FACULTY' ? uploadedById : undefined);
    sendSuccess(res, materials);
  } catch (err) { next(err); }
};

export const getMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await materialService.get(req.params.id));
  } catch (err) { next(err); }
};

export const uploadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      sendError(res, 400, 'NO_FILE', 'No file was uploaded');
      return;
    }

    const material = await materialService.upload({
      courseId: req.body.courseId,
      title: req.body.title,
      description: req.body.description,
      uploadedById: req.user!.id,
      file: {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    sendSuccess(res, material, 'Material uploaded successfully', 201);
  } catch (err) { next(err); }
};

export const downloadMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stream, material } = await materialService.download(req.params.id);

    res.setHeader('Content-Type', material.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(material.originalFileName)}"`
    );
    res.setHeader('Content-Length', material.fileSize);
    res.setHeader('X-File-Hash', material.fileHash);
    res.setHeader('X-File-Version', material.version);

    stream.pipe(res);
  } catch (err) { next(err); }
};

export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await materialService.deactivate(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, null, 'Material removed');
  } catch (err) { next(err); }
};

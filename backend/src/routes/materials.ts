import { Router } from 'express';
import multer from 'multer';
import * as material from '../controllers/materialController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { config } from '../config/config';

const router = Router();

// Use memory storage so we can calculate hash before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, PPT, and PPTX files are allowed'));
    }
  },
});

router.use(authenticate);

router.get('/', anyRole, material.listMaterials);
router.post('/upload', anyRole, upload.single('file'), material.uploadMaterial);
router.get('/:id', anyRole, material.getMaterial);
router.get('/:id/download', anyRole, material.downloadMaterial);
router.delete('/:id', anyRole, material.deleteMaterial);

export default router;

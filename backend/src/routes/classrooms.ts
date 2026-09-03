import { Router } from 'express';
import * as classroom from '../controllers/classroomController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { validate } from '../validators/validate';
import { classroomSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', anyRole, classroom.listClassrooms);
router.post('/', adminOnly, validate(classroomSchema), classroom.createClassroom);
router.get('/:id', anyRole, classroom.getClassroom);
router.put('/:id', adminOnly, validate(classroomSchema), classroom.updateClassroom);
router.patch('/:id/status', adminOnly, classroom.setClassroomStatus);

export default router;

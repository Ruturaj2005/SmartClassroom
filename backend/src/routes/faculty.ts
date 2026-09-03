import { Router } from 'express';
import * as faculty from '../controllers/facultyController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { validate } from '../validators/validate';
import { createUserSchema, updateFacultySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/stats', adminOnly, faculty.getDashboardStats);

/**
 * GET /faculty/names
 * Returns a minimal list of faculty (id, name, employeeId, department) for use
 * in dropdowns and timetable forms. Accessible by any authenticated user.
 * Does NOT expose sensitive data (email, RFID, isActive, role).
 */
router.get('/names', anyRole, faculty.listFacultyNames);

router.get('/', adminOnly, faculty.listFaculty);
router.post('/', adminOnly, validate(createUserSchema), faculty.createFaculty);
router.get('/:id', adminOnly, faculty.getFaculty);
router.put('/:id', adminOnly, validate(updateFacultySchema), faculty.updateFaculty);
router.patch('/:id/status', adminOnly, faculty.setFacultyStatus);

export default router;

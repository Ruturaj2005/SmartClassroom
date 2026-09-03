import { Router } from 'express';
import * as timetable from '../controllers/timetableController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { validate } from '../validators/validate';
import { timetableSlotSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

// These specific routes must come BEFORE /:id
router.get('/today', anyRole, timetable.getTodayTimetable);
router.get('/current', anyRole, timetable.getCurrentLecture);

router.get('/', anyRole, timetable.listTimetable);
router.post('/', adminOnly, validate(timetableSlotSchema), timetable.createTimetableSlot);
router.get('/:id', anyRole, timetable.getTimetableSlot);
router.put('/:id', adminOnly, validate(timetableSlotSchema), timetable.updateTimetableSlot);
router.delete('/:id', adminOnly, timetable.deleteTimetableSlot);

export default router;

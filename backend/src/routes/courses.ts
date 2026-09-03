import { Router } from 'express';
import * as course from '../controllers/courseController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { validate } from '../validators/validate';
import { courseSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', anyRole, course.listCourses);
router.post('/', adminOnly, validate(courseSchema), course.createCourse);
router.get('/:id', anyRole, course.getCourse);
router.put('/:id', adminOnly, validate(courseSchema), course.updateCourse);
router.patch('/:id/status', adminOnly, course.setCourseStatus);

// Faculty assignments
router.get('/:id/faculty', anyRole, course.getCourseFaculty);
router.post('/:id/faculty', adminOnly, course.assignFaculty);
router.delete('/:id/faculty/:facultyId', adminOnly, course.removeFaculty);

export default router;

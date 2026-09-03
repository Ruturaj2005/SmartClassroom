import { Request, Response, NextFunction } from 'express';
import { courseService } from '../services/courseService';
import { sendSuccess } from '../utils/response';

export const listCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await courseService.list();
    sendSuccess(res, courses);
  } catch (err) { next(err); }
};

export const getCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await courseService.get(req.params.id);
    sendSuccess(res, course);
  } catch (err) { next(err); }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await courseService.create(req.body);
    sendSuccess(res, course, 'Course created', 201);
  } catch (err) { next(err); }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await courseService.update(req.params.id, req.body);
    sendSuccess(res, course, 'Course updated');
  } catch (err) { next(err); }
};

export const setCourseStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await courseService.setStatus(req.params.id, req.body.isActive);
    sendSuccess(res, course);
  } catch (err) { next(err); }
};

export const getCourseFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faculty = await courseService.getCourseFaculty(req.params.id);
    sendSuccess(res, faculty);
  } catch (err) { next(err); }
};

export const assignFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await courseService.assignFaculty(req.params.id, {
      facultyId: req.body.facultyId,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
    });
    sendSuccess(res, assignment, 'Faculty assigned', 201);
  } catch (err) { next(err); }
};

export const removeFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await courseService.removeFaculty(req.params.id, req.params.facultyId);
    sendSuccess(res, null, 'Faculty removed from course');
  } catch (err) { next(err); }
};

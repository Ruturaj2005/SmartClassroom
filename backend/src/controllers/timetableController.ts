import { Request, Response, NextFunction } from 'express';
import { timetableService } from '../services/timetableService';
import { sendSuccess } from '../utils/response';

export const listTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { facultyId, classroomId, courseId } = req.query as Record<string, string>;
    const slots = await timetableService.list({ facultyId, classroomId, courseId });
    sendSuccess(res, slots);
  } catch (err) { next(err); }
};

export const getTimetableSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await timetableService.get(req.params.id));
  } catch (err) { next(err); }
};

export const createTimetableSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slot = await timetableService.create(req.body);
    sendSuccess(res, slot, 'Timetable slot created', 201);
  } catch (err) { next(err); }
};

export const updateTimetableSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slot = await timetableService.update(req.params.id, req.body);
    sendSuccess(res, slot, 'Timetable slot updated');
  } catch (err) { next(err); }
};

export const deleteTimetableSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await timetableService.delete(req.params.id);
    sendSuccess(res, null, 'Timetable slot removed');
  } catch (err) { next(err); }
};

export const getTodayTimetable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await timetableService.getToday();
    sendSuccess(res, slots);
  } catch (err) { next(err); }
};

export const getCurrentLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId, facultyId } = req.query as Record<string, string>;
    const result = await timetableService.getCurrentLecture({ classroomId, facultyId });
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

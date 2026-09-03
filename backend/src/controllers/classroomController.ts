import { Request, Response, NextFunction } from 'express';
import { classroomService } from '../services/classroomService';
import { sendSuccess } from '../utils/response';

export const listClassrooms = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await classroomService.list()); } catch (err) { next(err); }
};

export const getClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await classroomService.get(req.params.id)); } catch (err) { next(err); }
};

export const createClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await classroomService.create(req.body), 'Classroom created', 201); } catch (err) { next(err); }
};

export const updateClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await classroomService.update(req.params.id, req.body), 'Classroom updated'); } catch (err) { next(err); }
};

export const setClassroomStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await classroomService.setStatus(req.params.id, req.body.isActive)); } catch (err) { next(err); }
};

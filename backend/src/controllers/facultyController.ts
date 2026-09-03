import { Request, Response, NextFunction } from 'express';
import { facultyService } from '../services/facultyService';
import { authService } from '../services/authService';
import { sendSuccess } from '../utils/response';

export const listFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faculty = await facultyService.listFaculty();
    sendSuccess(res, faculty);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /faculty/names  — anyRole
 * Returns minimal faculty info (id, name, employeeId, department) for dropdown use.
 * Does NOT expose sensitive fields like email, RFID cards, isActive, or role.
 */
export const listFacultyNames = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const faculty = await facultyService.listFacultyNames();
    sendSuccess(res, faculty);
  } catch (err) {
    next(err);
  }
};

export const getFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faculty = await facultyService.getFaculty(req.params.id);
    sendSuccess(res, faculty);
  } catch (err) {
    next(err);
  }
};

export const createFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.createUser(req.body);
    sendSuccess(res, result, 'Faculty created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const updateFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const faculty = await facultyService.updateFaculty(req.params.id, req.body);
    sendSuccess(res, faculty, 'Faculty updated successfully');
  } catch (err) {
    next(err);
  }
};

export const setFacultyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'isActive must be a boolean' } });
      return;
    }
    const result = await facultyService.setFacultyStatus(req.params.id, isActive);
    sendSuccess(res, result, `Faculty ${isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await facultyService.getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

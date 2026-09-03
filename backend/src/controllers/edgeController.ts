import { Request, Response, NextFunction } from 'express';
import { edgeService } from '../services/edgeService';
import { sendSuccess } from '../utils/response';
import { edgeAuthSchema, edgeDeviceSchema } from '../validators/schemas';
import { sessionService } from '../services/sessionService';

// ── Sessions ──────────────────────────────────────────────────────────────────

export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facultyId = req.user!.role === 'FACULTY' ? req.user!.facultyId : undefined;
    const sessions = await sessionService.list(facultyId);
    sendSuccess(res, sessions);
  } catch (err) { next(err); }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await sessionService.get(req.params.id)); } catch (err) { next(err); }
};

export const startSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await sessionService.start(req.body), 'Session started', 201);
  } catch (err) { next(err); }
};

export const endSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await sessionService.end(req.params.id), 'Session ended');
  } catch (err) { next(err); }
};

// ── Edge Devices ──────────────────────────────────────────────────────────────

export const listDevices = async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await edgeService.getDevices()); } catch (err) { next(err); }
};

export const createDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = edgeDeviceSchema.parse(req.body);
    sendSuccess(res, await edgeService.createDevice(input), 'Device registered', 201);
  } catch (err) { next(err); }
};

export const updateDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await edgeService.updateDevice(req.params.id, req.body), 'Device updated');
  } catch (err) { next(err); }
};

// ── Edge API (future Raspberry Pi endpoints) ──────────────────────────────────

/**
 * POST /api/v1/edge/authenticate
 *
 * Called by Raspberry Pi with scanned RFID UID and device code.
 * Hardware-agnostic: receives a string UID, not a hardware reference.
 */
export const edgeAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid, deviceCode } = edgeAuthSchema.parse(req.body);
    const result = await edgeService.authenticate(uid, deviceCode);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/edge/current-lecture?classroomId=&facultyId=
 */
export const edgeCurrentLecture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { classroomId, facultyId } = req.query as Record<string, string>;
    const { timetableService } = await import('../services/timetableService');
    const result = await timetableService.getCurrentLecture({ classroomId, facultyId });
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/edge/sync?deviceCode=
 */
export const edgeSync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceCode } = req.query as { deviceCode: string };
    const result = await edgeService.getSyncData(deviceCode);
    sendSuccess(res, result);
  } catch (err) { next(err); }
};

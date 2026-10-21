import { Request, Response, NextFunction } from 'express';
import { edgeService } from '../services/edgeService';
import { sendSuccess } from '../utils/response';
import { edgeAuthSchema, edgeDeviceSchema, edgeOpenSchema, edgeTapSchema } from '../validators/schemas';
import { materialService } from '../services/materialService';
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

export const regenerateDeviceKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await edgeService.regenerateApiKey(req.params.id), 'New device key issued');
  } catch (err) { next(err); }
};

export const updateDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await edgeService.updateDevice(req.params.id, req.body), 'Device updated');
  } catch (err) { next(err); }
};

// ── Edge API (Raspberry Pi, authenticated by X-Device-Key) ────────────────────

/**
 * POST /api/v1/edge/tap  { uid }
 *
 * Faculty tapped their card on this classroom's reader. Returns the faculty's
 * own materials and a tap token for opening them.
 */
export const edgeTap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = edgeTapSchema.parse(req.body);
    sendSuccess(res, await edgeService.tap(uid.toUpperCase(), req.device!));
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/edge/materials/:id/file?format=pdf|original
 *
 * Streams a material the tapped faculty owns. format=pdf (default) serves the
 * converted PDF when one exists and falls back to the original upload.
 */
export const edgeMaterialFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await edgeService.assertOwnMaterial(req.params.id, req.tap!);
    const preferPdf = req.query.format !== 'original';
    const { stream, material, mimeType, fileName, format } =
      await materialService.openForDisplay(req.params.id, preferPdf);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('X-File-Hash', material.fileHash);
    res.setHeader('X-File-Version', material.version);
    res.setHeader('X-File-Format', format);

    stream.pipe(res);
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/edge/materials/:id/open  { retrievalMode }
 * Logs a lecture session when the faculty opens a material on the device.
 */
export const edgeOpenMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { retrievalMode } = edgeOpenSchema.parse(req.body ?? {});
    const result = await edgeService.openMaterial(req.params.id, req.tap!, req.device!, retrievalMode);
    sendSuccess(res, result, 'Session started', 201);
  } catch (err) { next(err); }
};

/** POST /api/v1/edge/logout — closes the faculty's open sessions on this device */
export const edgeLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await edgeService.logout(req.tap!, req.device!), 'Logged out');
  } catch (err) { next(err); }
};

/** GET /api/v1/edge/me — lets a device check its key and see its classroom */
export const edgeWhoAmI = async (req: Request, res: Response) => {
  sendSuccess(res, req.device);
};

/**
 * POST /api/v1/edge/simulate-tap  { uid, deviceCode }  (admin only)
 * Used by the RFID Test Console to try the tap flow without hardware.
 */
export const edgeSimulateTap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid, deviceCode } = edgeAuthSchema.parse(req.body);
    sendSuccess(res, await edgeService.simulateTap(uid.toUpperCase(), deviceCode.toUpperCase()));
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

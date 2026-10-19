import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { EdgeTapTokenPayload } from '../types';
import { hashDeviceKey } from '../utils/deviceKey';
import { sendError } from '../utils/response';

/**
 * Authenticates a classroom Raspberry Pi by its X-Device-Key header
 * and attaches the device + classroom to the request.
 */
export async function authenticateDevice(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-device-key');
  if (!key) {
    sendError(res, 401, 'UNAUTHORIZED', 'Device key required');
    return;
  }

  try {
    const device = await prisma.edgeDevice.findUnique({
      where: { apiKeyHash: hashDeviceKey(key) },
      include: { classroom: { select: { id: true, name: true } } },
    });

    if (!device) {
      sendError(res, 401, 'INVALID_DEVICE_KEY', 'Invalid device key');
      return;
    }
    if (device.status === 'MAINTENANCE') {
      sendError(res, 403, 'DEVICE_MAINTENANCE', 'Device is in maintenance mode');
      return;
    }

    await prisma.edgeDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), status: 'ONLINE' },
    });

    req.device = {
      id: device.id,
      deviceCode: device.deviceCode,
      classroomId: device.classroom.id,
      classroomName: device.classroom.name,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires a valid X-Tap-Token issued by POST /edge/tap on this same device,
 * for an RFID card that is still active. Must run after authenticateDevice.
 */
export async function requireTap(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-tap-token');
  if (!token) {
    sendError(res, 401, 'TAP_REQUIRED', 'Tap your RFID card first');
    return;
  }

  let payload: EdgeTapTokenPayload;
  try {
    payload = jwt.verify(token, config.jwt.secret) as EdgeTapTokenPayload;
  } catch (error) {
    const code = error instanceof jwt.TokenExpiredError ? 'TAP_EXPIRED' : 'INVALID_TAP_TOKEN';
    sendError(res, 401, code, 'Tap session expired or invalid, tap your card again');
    return;
  }

  if (payload.typ !== 'edge-tap' || payload.deviceId !== req.device?.id) {
    sendError(res, 401, 'INVALID_TAP_TOKEN', 'Tap session does not belong to this device');
    return;
  }

  try {
    // A card reported lost must stop working immediately, not when the token expires
    const card = await prisma.rFIDCard.findUnique({ where: { id: payload.rfidCardId } });
    if (!card || card.status !== 'ACTIVE') {
      sendError(res, 401, 'CARD_INACTIVE', 'RFID card is no longer active');
      return;
    }

    req.tap = {
      facultyId: payload.sub,
      userId: payload.userId,
      rfidCardId: payload.rfidCardId,
      deviceId: payload.deviceId,
    };
    next();
  } catch (err) {
    next(err);
  }
}

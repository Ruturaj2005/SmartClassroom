import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { createError } from '../middleware/errorHandler';
import { timetableService } from './timetableService';
import { AuthenticatedDevice, EdgeTapContext } from '../types';
import { generateDeviceKey, hashDeviceKey } from '../utils/deviceKey';
import { logger } from '../utils/logger';

const deviceSelect = {
  id: true,
  deviceCode: true,
  classroomId: true,
  status: true,
  lastSeenAt: true,
  lastSyncAt: true,
  softwareVersion: true,
  apiKeyHash: true,
  createdAt: true,
  updatedAt: true,
  classroom: true,
} as const;

/** Never send the key hash to clients, only whether a key exists */
function toPublicDevice<T extends { apiKeyHash: string | null }>(device: T) {
  const { apiKeyHash, ...rest } = device;
  return { ...rest, hasApiKey: !!apiKeyHash };
}

export class EdgeService {
  /**
   * RFID tap on a classroom device.
   *
   * Flow:
   *   UID → RFID card → Faculty → all active materials that faculty uploaded
   *       → short-lived tap token the device uses to open those materials
   *
   * Materials for the lecture scheduled right now (if any) are listed first.
   */
  async tap(uid: string, device: AuthenticatedDevice) {
    const rfidCard = await prisma.rFIDCard.findUnique({
      where: { uid },
      include: {
        faculty: {
          select: { id: true, userId: true, name: true, employeeId: true, department: true },
        },
      },
    });

    if (!rfidCard || rfidCard.status !== 'ACTIVE') {
      logger.warn('Edge tap failed: RFID not found or inactive', { uid, deviceCode: device.deviceCode });
      return {
        authenticated: false as const,
        reason: rfidCard ? 'RFID card is inactive or lost' : 'RFID card not registered',
      };
    }

    const faculty = rfidCard.faculty;

    const [materials, currentLecture] = await Promise.all([
      prisma.material.findMany({
        where: { uploadedById: faculty.userId, isActive: true },
        include: { course: { select: { id: true, courseCode: true, courseName: true } } },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      timetableService.getCurrentLecture({ classroomId: device.classroomId, facultyId: faculty.id }),
      prisma.rFIDCard.update({ where: { id: rfidCard.id }, data: { lastUsedAt: new Date() } }),
    ]);

    const currentCourseId = currentLecture.active ? currentLecture.slot?.course.id : undefined;

    // Show only the latest version of each (course, title)
    const latest = new Map<string, (typeof materials)[number]>();
    for (const m of materials) {
      const key = `${m.courseId}::${m.title}`;
      const existing = latest.get(key);
      if (!existing || m.version > existing.version) latest.set(key, m);
    }

    const list = [...latest.values()]
      .map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        course: m.course,
        version: m.version,
        fileHash: m.fileHash,
        originalFileName: m.originalFileName,
        mimeType: m.mimeType,
        fileSize: m.fileSize,
        pdfAvailable: m.conversionStatus === 'DONE' && !!m.pdfRelativePath,
        updatedAt: m.updatedAt,
        isCurrentLecture: m.courseId === currentCourseId,
      }))
      .sort((a, b) => Number(b.isCurrentLecture) - Number(a.isCurrentLecture));

    const tapToken = jwt.sign(
      { typ: 'edge-tap', userId: faculty.userId, rfidCardId: rfidCard.id, deviceId: device.id },
      config.jwt.secret,
      { subject: faculty.id, expiresIn: config.edge.tapTokenExpiresIn } as jwt.SignOptions
    );

    logger.info('Edge tap accepted', {
      facultyId: faculty.id,
      deviceCode: device.deviceCode,
      materialCount: list.length,
    });

    return {
      authenticated: true as const,
      tapToken,
      faculty: {
        id: faculty.id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        department: faculty.department,
      },
      classroom: { id: device.classroomId, name: device.classroomName },
      currentLecture:
        currentLecture.active && currentLecture.slot
          ? {
              courseId: currentLecture.slot.course.id,
              courseCode: currentLecture.slot.course.courseCode,
              courseName: currentLecture.slot.course.courseName,
              startTime: currentLecture.slot.startTime,
              endTime: currentLecture.slot.endTime,
            }
          : null,
      materials: list,
    };
  }

  /**
   * Admin-only simulation of a tap, used by the RFID Test Console.
   * Behaves exactly like a real device tap, without a device key.
   */
  async simulateTap(uid: string, deviceCode: string) {
    const device = await prisma.edgeDevice.findUnique({
      where: { deviceCode },
      include: { classroom: { select: { id: true, name: true } } },
    });
    if (!device) throw createError(404, 'NOT_FOUND', 'Device not found');

    const result = await this.tap(uid, {
      id: device.id,
      deviceCode: device.deviceCode,
      classroomId: device.classroom.id,
      classroomName: device.classroom.name,
    });

    // The console only displays the result; it never needs a usable token
    if (result.authenticated) {
      const { tapToken, ...rest } = result;
      return rest;
    }
    return result;
  }

  /** Material must belong to the faculty who tapped */
  async assertOwnMaterial(materialId: string, tap: EdgeTapContext) {
    const material = await prisma.material.findUnique({ where: { id: materialId } });
    if (!material || !material.isActive) throw createError(404, 'NOT_FOUND', 'Material not found');
    if (material.uploadedById !== tap.userId) {
      throw createError(403, 'FORBIDDEN', 'This material belongs to another faculty member');
    }
    return material;
  }

  /**
   * Records that the faculty opened a material in this classroom.
   * Any earlier open session of theirs in this classroom is closed first.
   */
  async openMaterial(
    materialId: string,
    tap: EdgeTapContext,
    device: AuthenticatedDevice,
    retrievalMode: 'CACHE' | 'SERVER' | 'OFFLINE'
  ) {
    const material = await this.assertOwnMaterial(materialId, tap);

    await this.closeSessions(tap, device);
    const session = await prisma.lectureSession.create({
      data: {
        facultyId: tap.facultyId,
        courseId: material.courseId,
        classroomId: device.classroomId,
        materialId: material.id,
        retrievalMode,
        status: 'STARTED',
      },
    });

    logger.info('Lecture session started via edge', {
      sessionId: session.id,
      materialId,
      deviceCode: device.deviceCode,
      retrievalMode,
    });

    return { sessionId: session.id };
  }

  /** Faculty logged out on the device (tapped again or pressed log out) */
  async logout(tap: EdgeTapContext, device: AuthenticatedDevice) {
    const closed = await this.closeSessions(tap, device);
    return { closedSessions: closed };
  }

  private async closeSessions(tap: EdgeTapContext, device: AuthenticatedDevice) {
    const result = await prisma.lectureSession.updateMany({
      where: { facultyId: tap.facultyId, classroomId: device.classroomId, status: 'STARTED' },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    return result.count;
  }

  async getDevices() {
    const devices = await prisma.edgeDevice.findMany({
      select: deviceSelect,
      orderBy: { deviceCode: 'asc' },
    });
    return devices.map(toPublicDevice);
  }

  async createDevice(input: { deviceCode: string; classroomId: string; softwareVersion?: string }) {
    const existing = await prisma.classroom.findUnique({
      where: { id: input.classroomId },
      include: { edgeDevice: true },
    });

    if (!existing) throw createError(404, 'NOT_FOUND', 'Classroom not found');
    if (existing.edgeDevice) {
      throw createError(409, 'CONFLICT', 'This classroom already has an edge device');
    }

    // The plain key is returned exactly once; only its hash is stored
    const apiKey = generateDeviceKey();
    const device = await prisma.edgeDevice.create({
      data: {
        deviceCode: input.deviceCode,
        classroomId: input.classroomId,
        softwareVersion: input.softwareVersion,
        status: 'OFFLINE',
        apiKeyHash: hashDeviceKey(apiKey),
      },
      select: deviceSelect,
    });
    return { ...toPublicDevice(device), apiKey };
  }

  /** Issues a new key for a device, invalidating the old one */
  async regenerateApiKey(id: string) {
    const existing = await prisma.edgeDevice.findUnique({ where: { id } });
    if (!existing) throw createError(404, 'NOT_FOUND', 'Edge device not found');

    const apiKey = generateDeviceKey();
    const device = await prisma.edgeDevice.update({
      where: { id },
      data: { apiKeyHash: hashDeviceKey(apiKey) },
      select: deviceSelect,
    });
    logger.info('Device API key regenerated', { deviceCode: device.deviceCode });
    return { ...toPublicDevice(device), apiKey };
  }

  async updateDevice(id: string, input: Partial<{ deviceCode: string; softwareVersion: string; status: string }>) {
    const device = await prisma.edgeDevice.findUnique({ where: { id } });
    if (!device) throw createError(404, 'NOT_FOUND', 'Edge device not found');

    const updated = await prisma.edgeDevice.update({
      where: { id },
      data: input as any,
      select: deviceSelect,
    });
    return toPublicDevice(updated);
  }
}

export const edgeService = new EdgeService();

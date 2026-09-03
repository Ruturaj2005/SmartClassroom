import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { timetableService } from './timetableService';
import { rfidService } from './rfidService';
import { logger } from '../utils/logger';

export class EdgeService {
  /**
   * RFID Authentication endpoint.
   * Called by Raspberry Pi with a scanned UID and device code.
   *
   * Flow:
   *   UID → Find RFID card → Find Faculty → Find EdgeDevice → Find Classroom
   *       → getCurrentLecture → Find Material → Return lecture context
   *
   * This method is hardware-agnostic: it receives a UID string.
   * The Raspberry Pi + PN532 implementation will call this same endpoint.
   */
  async authenticate(uid: string, deviceCode: string) {
    // 1. Look up RFID card
    const rfidCard = await prisma.rFIDCard.findUnique({
      where: { uid },
      include: {
        faculty: {
          select: { id: true, name: true, employeeId: true, department: true },
        },
      },
    });

    if (!rfidCard || rfidCard.status !== 'ACTIVE') {
      logger.warn('Edge auth failed: RFID not found or inactive', { uid });
      return {
        authenticated: false,
        reason: rfidCard ? 'RFID card is inactive or lost' : 'RFID card not registered',
      };
    }

    // 2. Look up edge device by device code
    const device = await prisma.edgeDevice.findUnique({
      where: { deviceCode },
      include: { classroom: true },
    });

    if (!device || device.status === 'MAINTENANCE') {
      logger.warn('Edge auth failed: device not found or in maintenance', { deviceCode });
      return {
        authenticated: false,
        reason: 'Device not found or in maintenance',
      };
    }

    // 3. Update RFID lastUsedAt and device lastSeenAt
    await Promise.all([
      prisma.rFIDCard.update({
        where: { id: rfidCard.id },
        data: { lastUsedAt: new Date() },
      }),
      prisma.edgeDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date() },
      }),
    ]);

    // 4. Get current lecture for this classroom
    const lectureResult = await timetableService.getCurrentLecture({
      classroomId: device.classroom.id,
      facultyId: rfidCard.faculty.id,
    });

    if (!lectureResult.active || !lectureResult.slot) {
      logger.info('Edge auth: no active lecture', {
        uid,
        classroomId: device.classroom.id,
      });

      return {
        authenticated: true,
        faculty: {
          id: rfidCard.faculty.id,
          name: rfidCard.faculty.name,
          employeeId: rfidCard.faculty.employeeId,
        },
        classroom: {
          id: device.classroom.id,
          name: device.classroom.name,
        },
        lecture: null,
        material: null,
        message: 'No active lecture at this time',
      };
    }

    const slot = lectureResult.slot;

    // 5. Start a lecture session
    const session = await prisma.lectureSession.create({
      data: {
        facultyId: rfidCard.faculty.id,
        courseId: slot.course.id,
        classroomId: device.classroom.id,
        materialId: slot.latestMaterial?.id ?? null,
        retrievalMode: 'SERVER',
        status: 'STARTED',
      },
    });

    logger.info('Lecture session started via edge', {
      sessionId: session.id,
      uid,
      courseId: slot.course.id,
    });

    return {
      authenticated: true,
      faculty: {
        id: rfidCard.faculty.id,
        name: rfidCard.faculty.name,
        employeeId: rfidCard.faculty.employeeId,
      },
      classroom: {
        id: device.classroom.id,
        name: device.classroom.name,
      },
      lecture: {
        sessionId: session.id,
        courseId: slot.course.id,
        courseCode: slot.course.courseCode,
        courseName: slot.course.courseName,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      material: slot.latestMaterial
        ? {
            id: slot.latestMaterial.id,
            title: slot.latestMaterial.title,
            fileName: slot.latestMaterial.storedFileName,
            version: slot.latestMaterial.version,
            hash: slot.latestMaterial.fileHash,
          }
        : null,
    };
  }

  async getDevices() {
    return prisma.edgeDevice.findMany({
      include: { classroom: true },
      orderBy: { deviceCode: 'asc' },
    });
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

    return prisma.edgeDevice.create({
      data: {
        deviceCode: input.deviceCode,
        classroomId: input.classroomId,
        softwareVersion: input.softwareVersion,
        status: 'OFFLINE',
      },
      include: { classroom: true },
    });
  }

  async updateDevice(id: string, input: Partial<{ deviceCode: string; softwareVersion: string; status: string }>) {
    const device = await prisma.edgeDevice.findUnique({ where: { id } });
    if (!device) throw createError(404, 'NOT_FOUND', 'Edge device not found');

    return prisma.edgeDevice.update({ where: { id }, data: input as any });
  }

  /**
   * Sync endpoint: returns all materials a device needs for upcoming slots.
   * Used by Raspberry Pi to pre-cache materials for the day.
   */
  async getSyncData(deviceCode: string) {
    const device = await prisma.edgeDevice.findUnique({
      where: { deviceCode },
      include: { classroom: true },
    });

    if (!device) throw createError(404, 'NOT_FOUND', 'Device not found');

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[new Date().getDay()];

    const slots = await prisma.timetableSlot.findMany({
      where: { classroomId: device.classroom.id, isActive: true },
      include: {
        course: {
          include: {
            materials: {
              where: { isActive: true },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    await prisma.edgeDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date(), lastSeenAt: new Date() },
    });

    return {
      device: { id: device.id, deviceCode: device.deviceCode },
      classroom: { id: device.classroom.id, name: device.classroom.name },
      today,
      syncedAt: new Date(),
      materials: slots.flatMap((slot) =>
        slot.course.materials.map((m) => ({
          materialId: m.id,
          title: m.title,
          version: m.version,
          fileHash: m.fileHash,
          courseCode: slot.course.courseCode,
        }))
      ),
    };
  }
}

export const edgeService = new EdgeService();

import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { RegisterRFIDInput } from '../validators/schemas';

export class RFIDService {
  async listAllRFID() {
    return prisma.rFIDCard.findMany({
      include: {
        faculty: {
          select: { id: true, name: true, employeeId: true, department: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async getByUID(uid: string) {
    const card = await prisma.rFIDCard.findUnique({
      where: { uid },
      include: {
        faculty: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!card) {
      throw createError(404, 'NOT_FOUND', `No RFID card found with UID: ${uid}`);
    }

    return card;
  }

  async register(input: RegisterRFIDInput) {
    // Verify faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: input.facultyId },
      include: { rfidCards: { where: { status: 'ACTIVE' } } },
    });

    if (!faculty) {
      throw createError(404, 'NOT_FOUND', 'Faculty not found');
    }

    // Deactivate existing active cards for this faculty
    if (faculty.rfidCards.length > 0) {
      await prisma.rFIDCard.updateMany({
        where: { facultyId: input.facultyId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      logger.info('Previous RFID cards deactivated', {
        facultyId: input.facultyId,
        count: faculty.rfidCards.length,
      });
    }

    // Check UID uniqueness across all cards
    const existing = await prisma.rFIDCard.findUnique({ where: { uid: input.uid } });
    if (existing) {
      throw createError(409, 'DUPLICATE_UID', 'This RFID UID is already registered');
    }

    const card = await prisma.rFIDCard.create({
      data: {
        uid: input.uid,
        facultyId: input.facultyId,
        status: 'ACTIVE',
      },
      include: {
        faculty: { select: { name: true, employeeId: true } },
      },
    });

    logger.info('RFID card registered', { uid: input.uid, facultyId: input.facultyId });
    return card;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'LOST') {
    const card = await prisma.rFIDCard.findUnique({ where: { id } });
    if (!card) {
      throw createError(404, 'NOT_FOUND', 'RFID card not found');
    }

    // If activating, deactivate other active cards for same faculty
    if (status === 'ACTIVE') {
      await prisma.rFIDCard.updateMany({
        where: { facultyId: card.facultyId, status: 'ACTIVE', NOT: { id } },
        data: { status: 'INACTIVE' },
      });
    }

    return prisma.rFIDCard.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string) {
    const card = await prisma.rFIDCard.findUnique({ where: { id } });
    if (!card) {
      throw createError(404, 'NOT_FOUND', 'RFID card not found');
    }

    await prisma.rFIDCard.delete({ where: { id } });
    logger.info('RFID card deleted', { id, uid: card.uid });
  }
}

export const rfidService = new RFIDService();

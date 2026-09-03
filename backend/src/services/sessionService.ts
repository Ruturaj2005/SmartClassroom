import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { SessionInput } from '../validators/schemas';

export class SessionService {
  async list(facultyId?: string) {
    return prisma.lectureSession.findMany({
      where: { ...(facultyId && { facultyId }) },
      include: {
        faculty: { select: { name: true, employeeId: true } },
        course: { select: { courseCode: true, courseName: true } },
        classroom: { select: { name: true, building: true } },
        material: { select: { title: true, version: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string) {
    const session = await prisma.lectureSession.findUnique({
      where: { id },
      include: {
        faculty: true,
        course: true,
        classroom: true,
        material: true,
      },
    });

    if (!session) throw createError(404, 'NOT_FOUND', 'Session not found');
    return session;
  }

  async start(input: SessionInput) {
    return prisma.lectureSession.create({
      data: {
        facultyId: input.facultyId,
        courseId: input.courseId,
        classroomId: input.classroomId,
        materialId: input.materialId,
        retrievalMode: input.retrievalMode,
        status: 'STARTED',
      },
      include: {
        faculty: { select: { name: true } },
        course: { select: { courseCode: true, courseName: true } },
        classroom: { select: { name: true } },
      },
    });
  }

  async end(id: string) {
    const session = await prisma.lectureSession.findUnique({ where: { id } });
    if (!session) throw createError(404, 'NOT_FOUND', 'Session not found');

    if (session.status !== 'STARTED') {
      throw createError(400, 'INVALID_STATE', 'Session is not in STARTED state');
    }

    return prisma.lectureSession.update({
      where: { id },
      data: { endedAt: new Date(), status: 'COMPLETED' },
    });
  }
}

export const sessionService = new SessionService();

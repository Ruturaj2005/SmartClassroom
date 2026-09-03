import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { ClassroomInput } from '../validators/schemas';

export class ClassroomService {
  async list() {
    return prisma.classroom.findMany({
      include: {
        edgeDevice: true,
        _count: { select: { timetableSlots: true } },
      },
      orderBy: [{ building: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async get(id: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        edgeDevice: true,
        timetableSlots: {
          where: { isActive: true },
          include: { course: true, faculty: true },
        },
      },
    });

    if (!classroom) throw createError(404, 'NOT_FOUND', 'Classroom not found');
    return classroom;
  }

  async create(input: ClassroomInput) {
    return prisma.classroom.create({ data: input });
  }

  async update(id: string, input: Partial<ClassroomInput>) {
    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) throw createError(404, 'NOT_FOUND', 'Classroom not found');

    return prisma.classroom.update({ where: { id }, data: input });
  }

  async setStatus(id: string, isActive: boolean) {
    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) throw createError(404, 'NOT_FOUND', 'Classroom not found');

    return prisma.classroom.update({ where: { id }, data: { isActive } });
  }
}

export const classroomService = new ClassroomService();

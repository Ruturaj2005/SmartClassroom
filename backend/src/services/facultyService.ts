import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { UpdateFacultyInput } from '../validators/schemas';

export class FacultyService {
  async listFaculty() {
    return prisma.faculty.findMany({
      include: {
        user: { select: { email: true, role: true, isActive: true, createdAt: true } },
        rfidCards: { where: { status: 'ACTIVE' }, select: { id: true, uid: true, status: true } },
        courseAssignments: {
          include: { course: { select: { courseCode: true, courseName: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Returns minimal faculty data safe for dropdown use by any authenticated role.
   * Does NOT include email, RFID cards, user.isActive, or role.
   */
  async listFacultyNames() {
    return prisma.faculty.findMany({
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
        designation: true,
      },
      where: {
        user: { isActive: true },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFaculty(id: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, role: true, isActive: true, createdAt: true } },
        rfidCards: true,
        courseAssignments: {
          include: { course: true },
        },
        timetableSlots: {
          where: { isActive: true },
          include: { course: true, classroom: true },
        },
      },
    });

    if (!faculty) {
      throw createError(404, 'NOT_FOUND', 'Faculty not found');
    }

    return faculty;
  }

  async updateFaculty(id: string, input: UpdateFacultyInput) {
    const faculty = await prisma.faculty.findUnique({ where: { id }, include: { user: true } });
    if (!faculty) {
      throw createError(404, 'NOT_FOUND', 'Faculty not found');
    }

    // Update faculty profile
    const updatedFaculty = await prisma.faculty.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.department && { department: input.department }),
        ...(input.designation && { designation: input.designation }),
        ...(input.email && {
          user: { update: { email: input.email } },
        }),
      },
      include: {
        user: { select: { email: true, role: true, isActive: true } },
      },
    });

    return updatedFaculty;
  }

  async setFacultyStatus(id: string, isActive: boolean) {
    const faculty = await prisma.faculty.findUnique({ where: { id } });
    if (!faculty) {
      throw createError(404, 'NOT_FOUND', 'Faculty not found');
    }

    return prisma.user.update({
      where: { id: faculty.userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true },
    });
  }

  async getDashboardStats() {
    const [
      totalFaculty,
      activeFaculty,
      totalCourses,
      activeCourses,
      activeRFID,
      activeClassrooms,
      totalMaterials,
    ] = await Promise.all([
      prisma.faculty.count(),
      prisma.user.count({ where: { role: 'FACULTY', isActive: true } }),
      prisma.course.count(),
      prisma.course.count({ where: { isActive: true } }),
      prisma.rFIDCard.count({ where: { status: 'ACTIVE' } }),
      prisma.classroom.count({ where: { isActive: true } }),
      prisma.material.count({ where: { isActive: true } }),
    ]);

    return {
      totalFaculty,
      activeFaculty,
      totalCourses,
      activeCourses,
      activeRFIDCards: activeRFID,
      activeClassrooms,
      totalMaterials,
    };
  }
}

export const facultyService = new FacultyService();

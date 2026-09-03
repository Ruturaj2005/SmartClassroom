import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { CourseInput, CourseAssignmentInput } from '../validators/schemas';

export class CourseService {
  async list() {
    return prisma.course.findMany({
      include: {
        assignments: {
          include: { faculty: { select: { name: true, employeeId: true } } },
        },
        _count: { select: { materials: true, timetableSlots: true } },
      },
      orderBy: { courseCode: 'asc' },
    });
  }

  async get(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { faculty: { include: { user: { select: { email: true } } } } },
        },
        materials: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
        timetableSlots: {
          where: { isActive: true },
          include: { faculty: true, classroom: true },
        },
      },
    });

    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');
    return course;
  }

  async create(input: CourseInput) {
    return prisma.course.create({ data: input });
  }

  async update(id: string, input: Partial<CourseInput>) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');

    return prisma.course.update({ where: { id }, data: input });
  }

  async setStatus(id: string, isActive: boolean) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');

    return prisma.course.update({ where: { id }, data: { isActive } });
  }

  async getCourseFaculty(courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');

    return prisma.courseAssignment.findMany({
      where: { courseId },
      include: { faculty: { include: { user: { select: { email: true } } } } },
    });
  }

  async assignFaculty(courseId: string, input: CourseAssignmentInput & { facultyId: string }) {
    const [course, faculty] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.faculty.findUnique({ where: { id: input.facultyId } }),
    ]);

    if (!course) throw createError(404, 'NOT_FOUND', 'Course not found');
    if (!faculty) throw createError(404, 'NOT_FOUND', 'Faculty not found');

    const existing = await prisma.courseAssignment.findFirst({
      where: {
        courseId,
        facultyId: input.facultyId,
        academicYear: input.academicYear,
        semester: input.semester,
      },
    });

    if (existing) {
      throw createError(409, 'DUPLICATE_ASSIGNMENT', 'Faculty already assigned to this course for this period');
    }

    return prisma.courseAssignment.create({
      data: {
        courseId,
        facultyId: input.facultyId,
        academicYear: input.academicYear,
        semester: input.semester,
      },
      include: { faculty: true, course: true },
    });
  }

  async removeFaculty(courseId: string, facultyId: string) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: { courseId, facultyId },
    });

    if (!assignment) {
      throw createError(404, 'NOT_FOUND', 'Assignment not found');
    }

    await prisma.courseAssignment.delete({ where: { id: assignment.id } });
  }
}

export const courseService = new CourseService();

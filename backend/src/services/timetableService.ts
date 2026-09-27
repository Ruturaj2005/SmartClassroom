import { DayOfWeek, TimetableSlot } from '@prisma/client';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { TimetableSlotInput } from '../validators/schemas';
import { logger } from '../utils/logger';

/**
 * Determines whether two time ranges [start1, end1) and [start2, end2) overlap.
 * Times are "HH:MM" strings (24-hour format).
 */
function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert to minutes for comparison
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // Overlap when neither is completely before the other
  return s1 < e2 && s2 < e1;
}

export interface CurrentLectureOptions {
  classroomId?: string;
  facultyId?: string;
  now?: Date;
}

export interface CurrentLectureResult {
  active: boolean;
  slot: (TimetableSlot & {
    course: { id: string; courseCode: string; courseName: string };
    faculty: { id: string; name: string; employeeId: string };
    classroom: { id: string; name: string; building: string; roomNumber: string };
    latestMaterial?: {
      id: string;
      title: string;
      storedFileName: string;
      version: number;
      fileHash: string;
    } | null;
  }) | null;
}

export class TimetableService {
  /**
   * Detect timetable conflicts for a new slot.
   * Checks:
   *   1. Classroom overlap (same classroom + day + overlapping time)
   *   2. Faculty double-booking (same faculty + day + overlapping time)
   *
   * If excludeId is provided, that slot is excluded from conflict detection (for updates).
   */
  async detectConflicts(
    input: TimetableSlotInput,
    excludeId?: string
  ): Promise<{ classroom: boolean; faculty: boolean; details: string[] }> {
    const existingSlots = await prisma.timetableSlot.findMany({
      where: {
        dayOfWeek: input.dayOfWeek as DayOfWeek,
        isActive: true,
        academicYear: input.academicYear,
        semester: input.semester,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      include: {
        course: { select: { courseName: true } },
        classroom: { select: { name: true } },
        faculty: { select: { name: true } },
      },
    });

    const details: string[] = [];
    let classroomConflict = false;
    let facultyConflict = false;

    for (const slot of existingSlots) {
      const overlaps = timesOverlap(
        input.startTime,
        input.endTime,
        slot.startTime,
        slot.endTime
      );

      if (!overlaps) continue;

      if (slot.classroomId === input.classroomId) {
        classroomConflict = true;
        details.push(
          `Classroom conflict: ${slot.classroom.name} already has "${slot.course.courseName}" from ${slot.startTime}–${slot.endTime} on ${input.dayOfWeek}`
        );
      }

      if (slot.facultyId === input.facultyId) {
        facultyConflict = true;
        details.push(
          `Faculty conflict: ${slot.faculty.name} already has "${slot.course.courseName}" from ${slot.startTime}–${slot.endTime} on ${input.dayOfWeek}`
        );
      }
    }

    return { classroom: classroomConflict, faculty: facultyConflict, details };
  }

  async list(filters?: { facultyId?: string; classroomId?: string; courseId?: string }) {
    return prisma.timetableSlot.findMany({
      where: {
        isActive: true,
        ...(filters?.facultyId && { facultyId: filters.facultyId }),
        ...(filters?.classroomId && { classroomId: filters.classroomId }),
        ...(filters?.courseId && { courseId: filters.courseId }),
      },
      include: {
        course: true,
        faculty: { include: { user: { select: { email: true } } } },
        classroom: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async get(id: string) {
    const slot = await prisma.timetableSlot.findUnique({
      where: { id },
      include: { course: true, faculty: true, classroom: true },
    });

    if (!slot) throw createError(404, 'NOT_FOUND', 'Timetable slot not found');
    return slot;
  }

  async create(input: TimetableSlotInput) {
    const { details, classroom, faculty } = await this.detectConflicts(input);

    if (classroom || faculty) {
      throw createError(
        409,
        'TIMETABLE_CONFLICT',
        `Scheduling conflict detected: ${details.join('; ')}`
      );
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        courseId: input.courseId,
        facultyId: input.facultyId,
        classroomId: input.classroomId,
        dayOfWeek: input.dayOfWeek as DayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        academicYear: input.academicYear,
        semester: input.semester,
      },
      include: { course: true, faculty: true, classroom: true },
    });

    logger.info('Timetable slot created', { id: slot.id });
    return slot;
  }

  async update(id: string, input: TimetableSlotInput) {
    const existing = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!existing) throw createError(404, 'NOT_FOUND', 'Timetable slot not found');

    const { details, classroom, faculty } = await this.detectConflicts(input, id);

    if (classroom || faculty) {
      throw createError(
        409,
        'TIMETABLE_CONFLICT',
        `Scheduling conflict detected: ${details.join('; ')}`
      );
    }

    return prisma.timetableSlot.update({
      where: { id },
      data: {
        courseId: input.courseId,
        facultyId: input.facultyId,
        classroomId: input.classroomId,
        dayOfWeek: input.dayOfWeek as DayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        academicYear: input.academicYear,
        semester: input.semester,
      },
      include: { course: true, faculty: true, classroom: true },
    });
  }

  async delete(id: string) {
    const slot = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw createError(404, 'NOT_FOUND', 'Timetable slot not found');

    // Soft delete — set isActive to false
    await prisma.timetableSlot.update({ where: { id }, data: { isActive: false } });
    logger.info('Timetable slot deactivated', { id });
  }

  async getToday() {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const today = days[new Date().getDay()] as DayOfWeek;

    return prisma.timetableSlot.findMany({
      where: { dayOfWeek: today, isActive: true },
      include: { course: true, faculty: true, classroom: true },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * CORE SERVICE: getCurrentLecture()
   *
   * Determines if a lecture is currently active based on:
   * - current day of week
   * - current time (HH:MM)
   * - optional classroom filter
   * - optional faculty filter
   *
   * This is the central logic used by:
   * - Dashboard "current lecture" card
   * - /api/v1/timetable/current endpoint
   * - /api/v1/edge/current-lecture (future Raspberry Pi endpoint)
   *
   * The function is pure and reusable — it takes an optional `now` param
   * to make it testable.
   */
  async getCurrentLecture(options: CurrentLectureOptions = {}): Promise<CurrentLectureResult> {
    const now = options.now ?? new Date();

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[now.getDay()] as DayOfWeek;

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const slots = await prisma.timetableSlot.findMany({
      where: {
        dayOfWeek: currentDay,
        isActive: true,
        ...(options.classroomId && { classroomId: options.classroomId }),
        ...(options.facultyId && { facultyId: options.facultyId }),
      },
      include: {
        course: { select: { id: true, courseCode: true, courseName: true } },
        faculty: { select: { id: true, name: true, employeeId: true } },
        classroom: { select: { id: true, name: true, building: true, roomNumber: true } },
      },
    });

    // Find an active slot
    const activeSlot = slots.find((slot) =>
      timesOverlap(currentTime, currentTime + '1', slot.startTime, slot.endTime)
    );

    // A simpler check: is currentTime within [startTime, endTime)?
    const matchingSlot = slots.find(
      (slot) => currentTime >= slot.startTime && currentTime < slot.endTime
    );

    if (!matchingSlot) {
      return { active: false, slot: null };
    }

    // Get the latest material for this course
    const latestMaterial = await prisma.material.findFirst({
      where: { courseId: matchingSlot.courseId, isActive: true },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        title: true,
        storedFileName: true,
        version: true,
        fileHash: true,
        fileUrl: true,
        storageProvider: true,
      },
    });

    return {
      active: true,
      slot: { ...matchingSlot, latestMaterial },
    };
  }
}

export const timetableService = new TimetableService();

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'FACULTY']),
  employeeId: z.string().min(1, 'Employee ID is required'),
  name: z.string().min(1, 'Name is required'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
});

export const updateFacultySchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export const rfidUidSchema = z
  .string()
  .min(1, 'RFID UID is required')
  .regex(
    /^([0-9A-Fa-f]{2}:){1,9}[0-9A-Fa-f]{2}$|^[0-9A-Fa-f]{8,20}$/,
    'Invalid RFID UID format. Use hex pairs like 04:A1:B2:C3 or plain hex like 04A1B2C3'
  );

export const registerRFIDSchema = z.object({
  facultyId: z.string().cuid('Invalid faculty ID'),
  uid: rfidUidSchema,
});

export const courseSchema = z.object({
  courseCode: z
    .string()
    .min(2, 'Course code must be at least 2 characters')
    .max(20, 'Course code must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Course code must be uppercase letters and numbers only'),
  courseName: z.string().min(1, 'Course name is required'),
  description: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
});

export const classroomSchema = z.object({
  name: z.string().min(1, 'Classroom name is required'),
  building: z.string().min(1, 'Building is required'),
  floor: z.string().min(1, 'Floor is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
});

export const timetableSlotSchema = z.object({
  courseId: z.string().cuid('Invalid course ID'),
  facultyId: z.string().cuid('Invalid faculty ID'),
  classroomId: z.string().cuid('Invalid classroom ID'),
  dayOfWeek: z.enum([
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ]),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24h)'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24h)'),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format'),
  semester: z.string().min(1, 'Semester is required'),
}).refine(
  (data) => data.startTime < data.endTime,
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

export const materialMetadataSchema = z.object({
  courseId: z.string().cuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
});

export const edgeDeviceSchema = z.object({
  deviceCode: z
    .string()
    .min(1, 'Device code is required')
    .regex(/^[A-Z0-9-]+$/, 'Device code must be uppercase letters, numbers, and hyphens'),
  classroomId: z.string().cuid('Invalid classroom ID'),
  softwareVersion: z.string().optional(),
});

export const courseAssignmentSchema = z.object({
  facultyId: z.string().cuid('Invalid faculty ID'),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format'),
  semester: z.string().min(1, 'Semester is required'),
});

export const sessionSchema = z.object({
  facultyId: z.string().cuid('Invalid faculty ID'),
  courseId: z.string().cuid('Invalid course ID'),
  classroomId: z.string().cuid('Invalid classroom ID'),
  materialId: z.string().cuid('Invalid material ID').optional(),
  retrievalMode: z.enum(['CACHE', 'SERVER', 'OFFLINE']).default('SERVER'),
});

export const edgeAuthSchema = z.object({
  uid: rfidUidSchema,
  deviceCode: z.string().min(1, 'Device code is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateFacultyInput = z.infer<typeof updateFacultySchema>;
export type RegisterRFIDInput = z.infer<typeof registerRFIDSchema>;
export type CourseAssignmentInput = z.infer<typeof courseAssignmentSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ClassroomInput = z.infer<typeof classroomSchema>;
export type TimetableSlotInput = z.infer<typeof timetableSlotSchema>;
export type MaterialMetadataInput = z.infer<typeof materialMetadataSchema>;
export type EdgeDeviceInput = z.infer<typeof edgeDeviceSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type EdgeAuthInput = z.infer<typeof edgeAuthSchema>;

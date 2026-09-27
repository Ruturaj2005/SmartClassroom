// ============================================================
// Shared Frontend TypeScript Types for SmartClass
// ============================================================

export type UserRole = 'ADMIN' | 'FACULTY';
export type RFIDStatus = 'ACTIVE' | 'INACTIVE' | 'LOST';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type RetrievalMode = 'CACHE' | 'SERVER' | 'OFFLINE';
export type SessionStatus = 'STARTED' | 'COMPLETED' | 'FAILED';
export type CacheStatus = 'CACHED' | 'EXPIRED' | 'INVALID';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  facultyId?: string;
  faculty?: Faculty;
}

// ── User / Faculty ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  faculty?: Faculty;
}

export interface Faculty {
  id: string;
  userId: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'email' | 'role' | 'isActive' | 'createdAt'>;
  rfidCards?: RFIDCard[];
  courseAssignments?: CourseAssignment[];
  timetableSlots?: TimetableSlot[];
}

// ── RFID ──────────────────────────────────────────────────────────────────────

export interface RFIDCard {
  id: string;
  uid: string;
  facultyId: string;
  status: RFIDStatus;
  registeredAt: string;
  lastUsedAt?: string;
  faculty?: Pick<Faculty, 'id' | 'name' | 'employeeId' | 'department'>;
}

// ── Course ────────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  description?: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignments?: CourseAssignment[];
  _count?: { materials: number; timetableSlots: number };
}

export interface CourseAssignment {
  id: string;
  facultyId: string;
  courseId: string;
  academicYear: string;
  semester: string;
  faculty?: Faculty;
  course?: Course;
}

// ── Classroom ─────────────────────────────────────────────────────────────────

export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: string;
  roomNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  edgeDevice?: EdgeDevice;
  _count?: { timetableSlots: number };
}

// ── Edge Device ───────────────────────────────────────────────────────────────

export interface EdgeDevice {
  id: string;
  deviceCode: string;
  classroomId: string;
  status: DeviceStatus;
  lastSeenAt?: string;
  lastSyncAt?: string;
  softwareVersion?: string;
  createdAt: string;
  updatedAt: string;
  classroom?: Classroom;
}

// ── Timetable ─────────────────────────────────────────────────────────────────

export interface TimetableSlot {
  id: string;
  courseId: string;
  facultyId: string;
  classroomId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course?: Course;
  faculty?: Faculty;
  classroom?: Classroom;
}

// ── Material ──────────────────────────────────────────────────────────────────

export interface Material {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  originalFileName: string;
  storedFileName: string;
  relativePath: string;
  fileUrl?: string | null;
  storageProvider?: string;
  mimeType: string;
  fileSize: number;
  version: number;
  fileHash: string;
  uploadedById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course?: Pick<Course, 'courseCode' | 'courseName'>;
  uploadedBy?: { email: string; faculty?: Pick<Faculty, 'name'> };
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface LectureSession {
  id: string;
  facultyId: string;
  courseId: string;
  classroomId: string;
  materialId?: string;
  startedAt: string;
  endedAt?: string;
  retrievalMode: RetrievalMode;
  status: SessionStatus;
  createdAt: string;
  faculty?: Pick<Faculty, 'name' | 'employeeId'>;
  course?: Pick<Course, 'courseCode' | 'courseName'>;
  classroom?: Pick<Classroom, 'name' | 'building'>;
  material?: Pick<Material, 'title' | 'version'>;
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  totalFaculty: number;
  activeFaculty: number;
  totalCourses: number;
  activeCourses: number;
  activeRFIDCards: number;
  activeClassrooms: number;
  totalMaterials: number;
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// ── Edge / RFID simulation ────────────────────────────────────────────────────

export interface EdgeAuthResult {
  authenticated: boolean;
  reason?: string;
  faculty?: { id: string; name: string; employeeId: string };
  classroom?: { id: string; name: string };
  lecture?: {
    sessionId: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    startTime: string;
    endTime: string;
  } | null;
  material?: {
    id: string;
    title: string;
    fileName: string;
    version: number;
    hash: string;
    fileUrl?: string | null;
    storageProvider?: string;
  } | null;
  message?: string;
}

export interface CurrentLectureResult {
  active: boolean;
  slot?: TimetableSlot & {
    latestMaterial?: Pick<Material, 'id' | 'title' | 'storedFileName' | 'version' | 'fileHash' | 'fileUrl' | 'storageProvider'> | null;
  };
}

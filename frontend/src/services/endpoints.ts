import api from './api';
import type {
  AuthUser, Faculty, RFIDCard, Course, CourseAssignment, Classroom,
  EdgeDevice, TimetableSlot, Material, LectureSession, DashboardStats,
  EdgeAuthResult, CurrentLectureResult, ApiResponse,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: AuthUser }>>('/auth/login', { email, password }),
  me: () => api.get<ApiResponse<AuthUser>>('/auth/me'),
  logout: () => api.post<ApiResponse<null>>('/auth/logout'),
};

// ── Faculty ───────────────────────────────────────────────────────────────────

export const facultyApi = {
  /** Admin-only: full faculty list with email, RFID cards, active status */
  list: () => api.get<ApiResponse<Faculty[]>>('/faculty'),

  /** Any authenticated role: minimal info (id, name, employeeId, department) for dropdowns */
  listNames: () =>
    api.get<ApiResponse<Pick<Faculty, 'id' | 'name' | 'employeeId' | 'department' | 'designation'>[]>>(
      '/faculty/names'
    ),

  get: (id: string) => api.get<ApiResponse<Faculty>>(`/faculty/${id}`),
  create: (data: {
    email: string; password: string; role: string;
    employeeId: string; name: string; department: string; designation: string;
  }) => api.post<ApiResponse<Faculty>>('/faculty', data),
  update: (id: string, data: Partial<{ name: string; department: string; designation: string; email: string }>) =>
    api.put<ApiResponse<Faculty>>(`/faculty/${id}`, data),
  setStatus: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<unknown>>(`/faculty/${id}/status`, { isActive }),
  getStats: () => api.get<ApiResponse<DashboardStats>>('/faculty/stats'),
};

// ── RFID ──────────────────────────────────────────────────────────────────────

export const rfidApi = {
  list: () => api.get<ApiResponse<RFIDCard[]>>('/rfid'),
  register: (facultyId: string, uid: string) =>
    api.post<ApiResponse<RFIDCard>>('/rfid/register', { facultyId, uid }),
  getByUID: (uid: string) => api.get<ApiResponse<RFIDCard>>(`/rfid/${encodeURIComponent(uid)}`),
  setStatus: (id: string, status: string) =>
    api.patch<ApiResponse<RFIDCard>>(`/rfid/${id}/status`, { status }),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/rfid/${id}`),
};

// ── Courses ───────────────────────────────────────────────────────────────────

export const courseApi = {
  list: () => api.get<ApiResponse<Course[]>>('/courses'),
  get: (id: string) => api.get<ApiResponse<Course>>(`/courses/${id}`),
  create: (data: { courseCode: string; courseName: string; department: string; description?: string }) =>
    api.post<ApiResponse<Course>>('/courses', data),
  update: (id: string, data: Partial<{ courseCode: string; courseName: string; department: string; description: string }>) =>
    api.put<ApiResponse<Course>>(`/courses/${id}`, data),
  setStatus: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<Course>>(`/courses/${id}/status`, { isActive }),
  getFaculty: (courseId: string) => api.get<ApiResponse<CourseAssignment[]>>(`/courses/${courseId}/faculty`),
  assignFaculty: (courseId: string, data: { facultyId: string; academicYear: string; semester: string }) =>
    api.post<ApiResponse<CourseAssignment>>(`/courses/${courseId}/faculty`, data),
  removeFaculty: (courseId: string, facultyId: string) =>
    api.delete<ApiResponse<null>>(`/courses/${courseId}/faculty/${facultyId}`),
};

// ── Classrooms ────────────────────────────────────────────────────────────────

export const classroomApi = {
  list: () => api.get<ApiResponse<Classroom[]>>('/classrooms'),
  get: (id: string) => api.get<ApiResponse<Classroom>>(`/classrooms/${id}`),
  create: (data: { name: string; building: string; floor: string; roomNumber: string }) =>
    api.post<ApiResponse<Classroom>>('/classrooms', data),
  update: (id: string, data: Partial<{ name: string; building: string; floor: string; roomNumber: string }>) =>
    api.put<ApiResponse<Classroom>>(`/classrooms/${id}`, data),
  setStatus: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<Classroom>>(`/classrooms/${id}/status`, { isActive }),
};

// ── Timetable ─────────────────────────────────────────────────────────────────

export const timetableApi = {
  list: (filters?: { facultyId?: string; classroomId?: string; courseId?: string }) =>
    api.get<ApiResponse<TimetableSlot[]>>('/timetable', { params: filters }),
  get: (id: string) => api.get<ApiResponse<TimetableSlot>>(`/timetable/${id}`),
  create: (data: {
    courseId: string; facultyId: string; classroomId: string; dayOfWeek: string;
    startTime: string; endTime: string; academicYear: string; semester: string;
  }) => api.post<ApiResponse<TimetableSlot>>('/timetable', data),
  update: (id: string, data: object) => api.put<ApiResponse<TimetableSlot>>(`/timetable/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/timetable/${id}`),
  getToday: () => api.get<ApiResponse<TimetableSlot[]>>('/timetable/today'),
  getCurrent: (params?: { classroomId?: string; facultyId?: string }) =>
    api.get<ApiResponse<CurrentLectureResult>>('/timetable/current', { params }),
};

// ── Materials ─────────────────────────────────────────────────────────────────

export const materialApi = {
  list: (courseId?: string) =>
    api.get<ApiResponse<Material[]>>('/materials', { params: courseId ? { courseId } : undefined }),
  get: (id: string) => api.get<ApiResponse<Material>>(`/materials/${id}`),
  upload: (formData: FormData) =>
    api.post<ApiResponse<Material>>('/materials/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDownloadUrl: (id: string) => `/materials/${id}/download`,
  delete: (id: string) => api.delete<ApiResponse<null>>(`/materials/${id}`),
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessionApi = {
  list: () => api.get<ApiResponse<LectureSession[]>>('/sessions'),
  get: (id: string) => api.get<ApiResponse<LectureSession>>(`/sessions/${id}`),
  start: (data: { facultyId: string; courseId: string; classroomId: string; materialId?: string }) =>
    api.post<ApiResponse<LectureSession>>('/sessions', data),
  end: (id: string) => api.patch<ApiResponse<LectureSession>>(`/sessions/${id}/end`, {}),
};

// ── Devices ───────────────────────────────────────────────────────────────────

export const deviceApi = {
  list: () => api.get<ApiResponse<EdgeDevice[]>>('/devices'),
  create: (data: { deviceCode: string; classroomId: string; softwareVersion?: string }) =>
    api.post<ApiResponse<EdgeDevice>>('/devices', data),
  update: (id: string, data: Partial<EdgeDevice>) => api.put<ApiResponse<EdgeDevice>>(`/devices/${id}`, data),
};

// ── Edge (RFID Test Console) ──────────────────────────────────────────────────

export const edgeApi = {
  authenticate: (uid: string, deviceCode: string) =>
    api.post<ApiResponse<EdgeAuthResult>>('/edge/authenticate', { uid, deviceCode }),
  currentLecture: (classroomId?: string, facultyId?: string) =>
    api.get<ApiResponse<CurrentLectureResult>>('/edge/current-lecture', {
      params: { classroomId, facultyId },
    }),
  sync: (deviceCode: string) =>
    api.get<ApiResponse<unknown>>('/edge/sync', { params: { deviceCode } }),
};

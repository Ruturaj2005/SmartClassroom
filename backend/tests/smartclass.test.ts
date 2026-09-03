import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ───────────────────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  faculty: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  rFIDCard: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  timetableSlot: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  material: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  lectureSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

vi.mock('../src/config/database', () => ({ prisma: mockPrisma }));
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Helper ────────────────────────────────────────────────────────────────────
function resetMocks() {
  Object.values(mockPrisma).forEach((entity) => {
    if (typeof entity === 'object') {
      Object.values(entity).forEach((fn) => {
        if (typeof fn === 'function') (fn as ReturnType<typeof vi.fn>).mockReset();
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Authentication
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  beforeEach(() => {
    resetMocks();
    vi.resetModules();
  });

  it('should return token on valid login', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 12);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      email: 'test@test.com',
      passwordHash: hash,
      role: 'FACULTY',
      isActive: true,
      faculty: { id: 'fac1' },
    });

    const { authService } = await import('../src/services/authService');
    const result = await authService.login({
      email: 'test@test.com',
      password: 'password123',
    }) as any;

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('test@test.com');
  });

  it('should throw INVALID_CREDENTIALS on wrong password', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('correct-password', 12);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      email: 'test@test.com',
      passwordHash: hash,
      role: 'FACULTY',
      isActive: true,
      faculty: null,
    });

    const { authService } = await import('../src/services/authService');
    await expect(
      authService.login({ email: 'test@test.com', password: 'wrong' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('should throw INVALID_CREDENTIALS when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { authService } = await import('../src/services/authService');
    await expect(
      authService.login({ email: 'notexist@test.com', password: 'any' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('should throw when creating user with duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const { authService } = await import('../src/services/authService');
    await expect(
      authService.createUser({
        email: 'existing@test.com',
        password: 'Pass@1234',
        role: 'FACULTY',
        employeeId: 'FAC999',
        name: 'Test',
        department: 'CS',
        designation: 'Lecturer',
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_EMAIL' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: RFID Service
// ─────────────────────────────────────────────────────────────────────────────
describe('RFIDService', () => {
  beforeEach(() => {
    resetMocks();
    vi.resetModules();
  });

  it('should register an RFID card for a faculty member', async () => {
    mockPrisma.faculty.findUnique.mockResolvedValue({
      id: 'fac1',
      rfidCards: [],
    });
    mockPrisma.rFIDCard.findUnique.mockResolvedValue(null); // UID not taken
    mockPrisma.rFIDCard.create.mockResolvedValue({
      id: 'rfid1',
      uid: '04:A1:B2:C3:D4',
      facultyId: 'fac1',
      status: 'ACTIVE',
      faculty: { name: 'Test Faculty', employeeId: 'FAC001' },
    });

    const { rfidService } = await import('../src/services/rfidService');
    const card = await rfidService.register({
      facultyId: 'fac1',
      uid: '04:A1:B2:C3:D4',
    });

    expect(card.uid).toBe('04:A1:B2:C3:D4');
    expect(mockPrisma.rFIDCard.create).toHaveBeenCalledOnce();
  });

  it('should reject duplicate RFID UID', async () => {
    mockPrisma.faculty.findUnique.mockResolvedValue({
      id: 'fac1',
      rfidCards: [],
    });
    mockPrisma.rFIDCard.findUnique.mockResolvedValue({ id: 'existing', uid: '04:A1:B2:C3:D4' });

    const { rfidService } = await import('../src/services/rfidService');
    await expect(
      rfidService.register({ facultyId: 'fac1', uid: '04:A1:B2:C3:D4' })
    ).rejects.toMatchObject({ code: 'DUPLICATE_UID' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Timetable Conflict Detection
// ─────────────────────────────────────────────────────────────────────────────
describe('TimetableService - Conflict Detection', () => {
  beforeEach(() => {
    resetMocks();
    vi.resetModules();
  });

  it('should detect classroom overlap', async () => {
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        classroomId: 'room1',
        facultyId: 'fac99',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        course: { courseName: 'IoT' },
        classroom: { name: 'C-302' },
        faculty: { name: 'Someone Else' },
      },
    ]);

    const { timetableService } = await import('../src/services/timetableService');
    const result = await timetableService.detectConflicts({
      classroomId: 'room1',
      facultyId: 'fac1',
      courseId: 'course1',
      dayOfWeek: 'MONDAY',
      startTime: '10:30',
      endTime: '11:30',
      academicYear: '2025-2026',
      semester: 'Sem 5',
    });

    expect(result.classroom).toBe(true);
    expect(result.faculty).toBe(false);
    expect(result.details.length).toBeGreaterThan(0);
  });

  it('should detect faculty double-booking', async () => {
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        classroomId: 'other-room',
        facultyId: 'fac1',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        course: { courseName: 'DBMS' },
        classroom: { name: 'C-303' },
        faculty: { name: 'Dr. Test' },
      },
    ]);

    const { timetableService } = await import('../src/services/timetableService');
    const result = await timetableService.detectConflicts({
      classroomId: 'room1',
      facultyId: 'fac1',
      courseId: 'course1',
      dayOfWeek: 'MONDAY',
      startTime: '10:30',
      endTime: '11:30',
      academicYear: '2025-2026',
      semester: 'Sem 5',
    });

    expect(result.faculty).toBe(true);
    expect(result.classroom).toBe(false);
  });

  it('should not detect conflict when times do not overlap', async () => {
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        classroomId: 'room1',
        facultyId: 'fac1',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        course: { courseName: 'IoT' },
        classroom: { name: 'C-302' },
        faculty: { name: 'Dr. Test' },
      },
    ]);

    const { timetableService } = await import('../src/services/timetableService');
    const result = await timetableService.detectConflicts({
      classroomId: 'room1',
      facultyId: 'fac1',
      courseId: 'course1',
      dayOfWeek: 'MONDAY',
      startTime: '11:00', // Starts exactly when the other ends — no overlap
      endTime: '12:00',
      academicYear: '2025-2026',
      semester: 'Sem 5',
    });

    expect(result.classroom).toBe(false);
    expect(result.faculty).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: getCurrentLecture()
// ─────────────────────────────────────────────────────────────────────────────
describe('TimetableService - getCurrentLecture()', () => {
  beforeEach(() => {
    resetMocks();
    vi.resetModules();
  });

  it('should return active=true when a slot is currently active', async () => {
    // Simulate Monday 10:20
    const monday1020 = new Date('2025-01-06T10:20:00'); // Jan 6, 2025 is a Monday

    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        courseId: 'course1',
        facultyId: 'fac1',
        classroomId: 'room1',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        course: { id: 'course1', courseCode: 'IOT301', courseName: 'Internet of Things' },
        faculty: { id: 'fac1', name: 'Dr. Priya', employeeId: 'FAC001' },
        classroom: { id: 'room1', name: 'C-302', building: 'C Block', roomNumber: '302' },
      },
    ]);

    mockPrisma.material.findFirst.mockResolvedValue({
      id: 'mat1',
      title: 'Unit 1 Notes',
      storedFileName: 'iot-unit1_v1_abc123.pdf',
      version: 1,
      fileHash: 'abc123def456',
    });

    const { timetableService } = await import('../src/services/timetableService');
    const result = await timetableService.getCurrentLecture({ now: monday1020 });

    expect(result.active).toBe(true);
    expect(result.slot?.course.courseCode).toBe('IOT301');
  });

  it('should return active=false when no slot matches current time', async () => {
    // Monday at 11:30 — after the 10:00–11:00 slot
    const monday1130 = new Date('2025-01-06T11:30:00');

    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot1',
        courseId: 'course1',
        facultyId: 'fac1',
        classroomId: 'room1',
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '11:00',
        course: { id: 'c1', courseCode: 'IOT301', courseName: 'IoT' },
        faculty: { id: 'f1', name: 'Dr. Test', employeeId: 'FAC001' },
        classroom: { id: 'r1', name: 'C-302', building: 'C Block', roomNumber: '302' },
      },
    ]);

    const { timetableService } = await import('../src/services/timetableService');
    const result = await timetableService.getCurrentLecture({ now: monday1130 });

    expect(result.active).toBe(false);
    expect(result.slot).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Material Service
// ─────────────────────────────────────────────────────────────────────────────
describe('MaterialService', () => {
  beforeEach(() => {
    resetMocks();
    vi.resetModules();
  });

  it('should reject invalid file types', async () => {
    // Mock storageService to avoid filesystem
    vi.doMock('../src/services/storage', () => ({
      storageService: {
        saveFile: vi.fn(),
        deleteFile: vi.fn(),
        fileExists: vi.fn().mockResolvedValue(true),
        getReadStream: vi.fn(),
        getAbsolutePath: vi.fn(),
      },
    }));

    mockPrisma.course.findUnique.mockResolvedValue({ id: 'course1', courseCode: 'IOT301' });

    const { materialService } = await import('../src/services/materialService');
    await expect(
      materialService.upload({
        courseId: 'course1',
        title: 'Test',
        uploadedById: 'user1',
        file: {
          buffer: Buffer.from('test'),
          originalname: 'malware.exe',
          mimetype: 'application/x-executable',
          size: 100,
        },
      })
    ).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  it('should auto-increment version for same title', async () => {
    vi.doMock('../src/services/storage', () => ({
      storageService: {
        saveFile: vi.fn().mockResolvedValue('path/to/file'),
        deleteFile: vi.fn(),
        fileExists: vi.fn().mockResolvedValue(true),
        getReadStream: vi.fn(),
        getAbsolutePath: vi.fn(),
      },
    }));

    mockPrisma.course.findUnique.mockResolvedValue({ id: 'course1', courseCode: 'IOT301' });
    mockPrisma.material.findFirst.mockResolvedValue({ version: 1 }); // existing version 1
    mockPrisma.material.create.mockResolvedValue({
      id: 'mat2',
      version: 2,
      fileHash: 'xyz',
      title: 'Unit Notes',
      course: { courseCode: 'IOT301', courseName: 'IoT' },
      uploadedBy: { email: 'test@test.com', faculty: { name: 'Dr. Test' } },
    });

    const { materialService } = await import('../src/services/materialService');
    const result = await materialService.upload({
      courseId: 'course1',
      title: 'Unit Notes',
      uploadedById: 'user1',
      file: {
        buffer: Buffer.from('%PDF-1.4 fake content'),
        originalname: 'notes.pdf',
        mimetype: 'application/pdf',
        size: 100,
      },
    }) as any;

    expect(result.version).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: File Hash Utility
// ─────────────────────────────────────────────────────────────────────────────
describe('File Utilities', () => {
  it('should calculate consistent SHA-256 hash', async () => {
    const { calculateSHA256 } = await import('../src/utils/fileUtils');
    const buf = Buffer.from('hello world');
    const hash1 = calculateSHA256(buf);
    const hash2 = calculateSHA256(buf);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('should generate unique safe filenames', async () => {
    const { generateSafeFilename } = await import('../src/utils/fileUtils');
    const name1 = generateSafeFilename('IoT Unit 3.pdf', 1);
    const name2 = generateSafeFilename('IoT Unit 3.pdf', 1);
    expect(name1).not.toBe(name2); // UUID component ensures uniqueness
    expect(name1).toMatch(/\.pdf$/);
    expect(name1).toMatch(/v1/);
    expect(name1).not.toContain(' ');
  });

  it('should detect path traversal attempts', async () => {
    const { assertPathWithin } = await import('../src/utils/fileUtils');
    expect(() =>
      assertPathWithin('/safe/base', '/safe/base/../../../etc/passwd')
    ).toThrow('Path traversal detected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 7: Role-Based Authorization
// ─────────────────────────────────────────────────────────────────────────────
describe('Authorization Middleware', () => {
  it('should allow ADMIN when ADMIN role is required', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const middleware = authorize('ADMIN');
    const req: any = { user: { id: '1', email: 'a@b.com', role: 'ADMIN' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject FACULTY when ADMIN role is required', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const middleware = authorize('ADMIN');
    const req: any = { user: { id: '1', email: 'f@b.com', role: 'FACULTY' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should reject unauthenticated requests', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const middleware = authorize('ADMIN');
    const req: any = { user: undefined };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 8: Faculty Names Endpoint — Authorization Fix Regression Tests
//
// These tests directly guard against regressions of the 403 bug where
// TimetablePage called GET /faculty (adminOnly) when a FACULTY user loaded it.
// ─────────────────────────────────────────────────────────────────────────────
describe('Authorization — Faculty Names Endpoint (Bug Fix: #403-on-timetable)', () => {
  // ── anyRole allows FACULTY ──────────────────────────────────────────────────

  it('should allow FACULTY user through anyRole middleware', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const anyRole = authorize('ADMIN', 'FACULTY');

    const req: any = { user: { id: 'fac1', email: 'priya@uni.edu', role: 'FACULTY' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    anyRole(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow ADMIN user through anyRole middleware', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const anyRole = authorize('ADMIN', 'FACULTY');

    const req: any = { user: { id: 'adm1', email: 'admin@uni.edu', role: 'ADMIN' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    anyRole(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── adminOnly still blocks FACULTY ─────────────────────────────────────────

  it('should block FACULTY from adminOnly (GET /faculty full list) — the root cause of the 403 bug', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const adminOnly = authorize('ADMIN');

    const req: any = { user: { id: 'fac1', email: 'priya@uni.edu', role: 'FACULTY' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    adminOnly(req, res, next);

    // This is the 403 that the original bug caused — must remain blocked
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ── listFacultyNames returns safe-only fields ──────────────────────────────

  it('FacultyService.listFacultyNames() should call findMany with only safe select fields', async () => {
    resetMocks();
    vi.resetModules();

    mockPrisma.faculty.findMany.mockResolvedValue([
      { id: 'fac1', name: 'Dr. Priya Sharma', employeeId: 'FAC001', department: 'CS', designation: 'Assoc. Prof' },
    ]);

    const { facultyService } = await import('../src/services/facultyService');
    const result = await facultyService.listFacultyNames();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'fac1', name: 'Dr. Priya Sharma', employeeId: 'FAC001' });

    // Verify the query uses select (not include) so sensitive fields are not fetched
    const callArg = mockPrisma.faculty.findMany.mock.calls[0][0] as any;
    expect(callArg.select).toBeDefined();
    expect(callArg.select.id).toBe(true);
    expect(callArg.select.name).toBe(true);
    expect(callArg.select.employeeId).toBe(true);
    // Must NOT include user, rfidCards, role, email in select
    expect(callArg.include).toBeUndefined();
  });

  // ── No token → 401 (not 403) ───────────────────────────────────────────────

  it('should return 401 (not 403) when no user is attached to request', async () => {
    const { authorize } = await import('../src/middleware/authorize');
    const anyRole = authorize('ADMIN', 'FACULTY');

    const req: any = { user: undefined };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    anyRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});


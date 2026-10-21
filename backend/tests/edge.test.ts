import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Mock Prisma ───────────────────────────────────────────────────────────────
const mockPrisma = {
  rFIDCard: { findUnique: vi.fn(), update: vi.fn() },
  material: { findMany: vi.fn(), findUnique: vi.fn() },
  edgeDevice: { findUnique: vi.fn(), update: vi.fn() },
  lectureSession: { create: vi.fn(), updateMany: vi.fn() },
  timetableSlot: { findMany: vi.fn() },
};

vi.mock('../src/config/database', () => ({ prisma: mockPrisma }));
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../src/services/timetableService', () => ({
  timetableService: { getCurrentLecture: vi.fn().mockResolvedValue({ active: false, slot: null }) },
}));

const device = { id: 'dev1', deviceCode: 'PI-C302', classroomId: 'room1', classroomName: 'C-302' };

const activeCard = {
  id: 'card1',
  uid: '04:A1:B2:C3:D4',
  status: 'ACTIVE',
  faculty: { id: 'fac1', userId: 'user1', name: 'Dr. Priya Sharma', employeeId: 'FAC001', department: 'CS' },
};

function material(overrides: Record<string, unknown>) {
  return {
    id: 'm1',
    courseId: 'course1',
    title: 'Unit 1',
    description: null,
    version: 1,
    fileHash: 'hash',
    originalFileName: 'unit1.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileSize: 100,
    conversionStatus: 'DONE',
    pdfRelativePath: 'courses/IOT301/2026/unit1.pdf',
    updatedAt: new Date(),
    uploadedById: 'user1',
    isActive: true,
    course: { id: 'course1', courseCode: 'IOT301', courseName: 'IoT' },
    ...overrides,
  };
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  Object.values(mockPrisma).forEach((entity) =>
    Object.values(entity).forEach((fn) => fn.mockReset())
  );
});

describe('EdgeService.tap()', () => {
  it('returns the faculty materials, latest version only, with a tap token', async () => {
    mockPrisma.rFIDCard.findUnique.mockResolvedValue(activeCard);
    mockPrisma.material.findMany.mockResolvedValue([
      material({ id: 'm1', version: 1 }),
      material({ id: 'm2', version: 2 }),
      material({ id: 'm3', title: 'Unit 2', conversionStatus: 'PENDING', pdfRelativePath: null }),
    ]);

    const { edgeService } = await import('../src/services/edgeService');
    const result = await edgeService.tap('04:A1:B2:C3:D4', device);

    expect(result.authenticated).toBe(true);
    if (!result.authenticated) return;

    expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uploadedById: 'user1', isActive: true } })
    );
    expect(result.materials.map((m) => m.id).sort()).toEqual(['m2', 'm3']);
    expect(result.materials.find((m) => m.id === 'm3')!.pdfAvailable).toBe(false);

    const payload = jwt.verify(result.tapToken, process.env.JWT_SECRET!) as any;
    expect(payload).toMatchObject({ typ: 'edge-tap', sub: 'fac1', userId: 'user1', deviceId: 'dev1' });
  });

  it('rejects unknown and lost cards', async () => {
    const { edgeService } = await import('../src/services/edgeService');

    mockPrisma.rFIDCard.findUnique.mockResolvedValue(null);
    expect(await edgeService.tap('04:00:00:00:00', device)).toMatchObject({
      authenticated: false,
      reason: 'RFID card not registered',
    });

    mockPrisma.rFIDCard.findUnique.mockResolvedValue({ ...activeCard, status: 'LOST' });
    expect(await edgeService.tap('04:A1:B2:C3:D4', device)).toMatchObject({ authenticated: false });
    expect(mockPrisma.material.findMany).not.toHaveBeenCalled();
  });

  it('simulateTap does not leak a usable tap token', async () => {
    mockPrisma.edgeDevice.findUnique.mockResolvedValue({
      id: 'dev1', deviceCode: 'PI-C302', classroom: { id: 'room1', name: 'C-302' },
    });
    mockPrisma.rFIDCard.findUnique.mockResolvedValue(activeCard);
    mockPrisma.material.findMany.mockResolvedValue([]);

    const { edgeService } = await import('../src/services/edgeService');
    const result = await edgeService.simulateTap('04:A1:B2:C3:D4', 'PI-C302');
    expect(result).not.toHaveProperty('tapToken');
  });
});

describe('EdgeService ownership', () => {
  const tap = { facultyId: 'fac1', userId: 'user1', rfidCardId: 'card1', deviceId: 'dev1' };

  it('forbids opening another faculty member\'s material', async () => {
    mockPrisma.material.findUnique.mockResolvedValue(material({ uploadedById: 'someone-else' }));
    const { edgeService } = await import('../src/services/edgeService');

    await expect(edgeService.openMaterial('m1', tap, device, 'SERVER')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockPrisma.lectureSession.create).not.toHaveBeenCalled();
  });

  it('closes earlier sessions and logs a new one when opening own material', async () => {
    mockPrisma.material.findUnique.mockResolvedValue(material({}));
    mockPrisma.lectureSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.lectureSession.create.mockResolvedValue({ id: 'sess1' });
    const { edgeService } = await import('../src/services/edgeService');

    expect(await edgeService.openMaterial('m1', tap, device, 'CACHE')).toEqual({ sessionId: 'sess1' });
    expect(mockPrisma.lectureSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { facultyId: 'fac1', classroomId: 'room1', status: 'STARTED' } })
    );
    expect(mockPrisma.lectureSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ courseId: 'course1', classroomId: 'room1', retrievalMode: 'CACHE' }),
    });
  });
});

describe('Device middleware', () => {
  it('rejects requests without or with an unknown device key', async () => {
    const { authenticateDevice } = await import('../src/middleware/authenticateDevice');
    const next = vi.fn();

    const res1 = mockRes();
    await authenticateDevice({ header: () => undefined } as any, res1, next);
    expect(res1.status).toHaveBeenCalledWith(401);

    mockPrisma.edgeDevice.findUnique.mockResolvedValue(null);
    const res2 = mockRes();
    await authenticateDevice({ header: () => 'scdev_wrong' } as any, res2, next);
    expect(res2.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('looks devices up by key hash, never the plain key', async () => {
    const { authenticateDevice } = await import('../src/middleware/authenticateDevice');
    const { hashDeviceKey } = await import('../src/utils/deviceKey');
    mockPrisma.edgeDevice.findUnique.mockResolvedValue({
      id: 'dev1', deviceCode: 'PI-C302', status: 'OFFLINE', classroom: { id: 'room1', name: 'C-302' },
    });

    const req: any = { header: () => 'scdev_abc' };
    const next = vi.fn();
    await authenticateDevice(req, mockRes(), next);

    expect(mockPrisma.edgeDevice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { apiKeyHash: hashDeviceKey('scdev_abc') } })
    );
    expect(req.device).toEqual(device);
    expect(next).toHaveBeenCalled();
  });

  it('rejects a tap token issued for a different device', async () => {
    const { requireTap } = await import('../src/middleware/authenticateDevice');
    const token = jwt.sign(
      { typ: 'edge-tap', userId: 'user1', rfidCardId: 'card1', deviceId: 'other-device' },
      process.env.JWT_SECRET!,
      { subject: 'fac1' }
    );

    const res = mockRes();
    const next = vi.fn();
    await requireTap({ header: () => token, device } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a tap token once the card is marked lost', async () => {
    const { requireTap } = await import('../src/middleware/authenticateDevice');
    const token = jwt.sign(
      { typ: 'edge-tap', userId: 'user1', rfidCardId: 'card1', deviceId: 'dev1' },
      process.env.JWT_SECRET!,
      { subject: 'fac1' }
    );
    mockPrisma.rFIDCard.findUnique.mockResolvedValue({ id: 'card1', status: 'LOST' });

    const res = mockRes();
    const next = vi.fn();
    await requireTap({ header: () => token, device } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('a tap token cannot be used as a web login token', async () => {
    const { authenticate } = await import('../src/middleware/authenticate');
    const token = jwt.sign(
      { typ: 'edge-tap', userId: 'user1', rfidCardId: 'card1', deviceId: 'dev1' },
      process.env.JWT_SECRET!,
      { subject: 'fac1' }
    );

    const res = mockRes();
    const next = vi.fn();
    authenticate({ headers: { authorization: `Bearer ${token}` } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

import { Router } from 'express';
import * as edge from '../controllers/edgeController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';
import { authenticateDevice, requireTap } from '../middleware/authenticateDevice';

const router = Router();

// ── Session routes ────────────────────────────────────────────────────────────
router.get('/sessions', authenticate, anyRole, edge.listSessions);
router.get('/sessions/:id', authenticate, anyRole, edge.getSession);
router.post('/sessions', authenticate, anyRole, edge.startSession);
router.patch('/sessions/:id/end', authenticate, anyRole, edge.endSession);

// ── Edge device management ────────────────────────────────────────────────────
router.get('/devices', authenticate, adminOnly, edge.listDevices);
router.post('/devices', authenticate, adminOnly, edge.createDevice);
router.put('/devices/:id', authenticate, adminOnly, edge.updateDevice);
router.post('/devices/:id/api-key', authenticate, adminOnly, edge.regenerateDeviceKey);

// ── Raspberry Pi classroom devices (X-Device-Key header) ─────────────────────
router.get('/edge/me', authenticateDevice, edge.edgeWhoAmI);
router.post('/edge/tap', authenticateDevice, edge.edgeTap);
router.get('/edge/materials/:id/file', authenticateDevice, requireTap, edge.edgeMaterialFile);
router.post('/edge/materials/:id/open', authenticateDevice, requireTap, edge.edgeOpenMaterial);
router.post('/edge/logout', authenticateDevice, requireTap, edge.edgeLogout);

// ── Admin tools ───────────────────────────────────────────────────────────────
router.post('/edge/simulate-tap', authenticate, adminOnly, edge.edgeSimulateTap);
router.get('/edge/current-lecture', authenticate, anyRole, edge.edgeCurrentLecture);

export default router;

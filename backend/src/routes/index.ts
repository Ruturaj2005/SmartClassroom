import { Router } from 'express';
import * as edge from '../controllers/edgeController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly, anyRole } from '../middleware/authorize';

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

// ── Future Raspberry Pi endpoints ─────────────────────────────────────────────
// NOTE: In future, these will use device-level API tokens instead of JWT.
// For now, they accept JWT to allow software testing.
router.post('/edge/authenticate', edge.edgeAuthenticate); // No auth - called by Pi
router.get('/edge/current-lecture', authenticate, anyRole, edge.edgeCurrentLecture);
router.get('/edge/sync', edge.edgeSync); // Will use device token later

export default router;

import { Router } from 'express';
import * as rfid from '../controllers/rfidController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly } from '../middleware/authorize';
import { validate } from '../validators/validate';
import { registerRFIDSchema } from '../validators/schemas';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/', rfid.listRFID);
router.post('/register', validate(registerRFIDSchema), rfid.registerRFID);
router.get('/:uid', rfid.getRFIDByUID);
router.patch('/:id/status', rfid.setRFIDStatus);
router.delete('/:id', rfid.deleteRFID);

export default router;

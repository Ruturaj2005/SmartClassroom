import { Request, Response, NextFunction } from 'express';
import { rfidService } from '../services/rfidService';
import { sendSuccess } from '../utils/response';

export const listRFID = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cards = await rfidService.listAllRFID();
    sendSuccess(res, cards);
  } catch (err) {
    next(err);
  }
};

export const registerRFID = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const card = await rfidService.register(req.body);
    sendSuccess(res, card, 'RFID card registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getRFIDByUID = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const card = await rfidService.getByUID(req.params.uid);
    sendSuccess(res, card);
  } catch (err) {
    next(err);
  }
};

export const setRFIDStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const card = await rfidService.setStatus(req.params.id, status);
    sendSuccess(res, card, 'RFID status updated');
  } catch (err) {
    next(err);
  }
};

export const deleteRFID = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rfidService.delete(req.params.id);
    sendSuccess(res, null, 'RFID card removed');
  } catch (err) {
    next(err);
  }
};

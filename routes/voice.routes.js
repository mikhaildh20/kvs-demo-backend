import express from 'express';
import { VoiceController } from '../controllers/voice.controller.js';

const router = express.Router();

router.post("/generate",VoiceController.generate);

export default router;
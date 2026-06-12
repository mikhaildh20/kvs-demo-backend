import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import { UploadController } from '../controllers/upload.controller.js';

const router = express.Router();

router.post('/file', upload.single('file'), UploadController.uploadFile);

export default router;
import express from 'express';
import { ColorController } from '../controllers/color.controller.js';

const router = express.Router();

router.get('/', ColorController.getAll);
router.get('/:id', ColorController.getById);
router.post('/', ColorController.create);
router.put('/:id', ColorController.update);
router.post('/toggle-status', ColorController.toggleStatus);

export default router;
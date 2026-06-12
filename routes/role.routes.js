import express from 'express';
import { RoleController } from '../controllers/role.controller.js';

const router = express.Router();

router.get('/', RoleController.getAll);
router.get('/:id/detail', RoleController.detail);
router.post('/:id/assign-menus', RoleController.assignMenus);
router.get('/:id', RoleController.getById);
router.post('/', RoleController.create);
router.put('/:id', RoleController.update);
router.post('/toggle-status', RoleController.toggleStatus);

export default router;

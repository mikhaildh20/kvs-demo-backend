import express from "express";
import { GroupMenuController } from "../controllers/groupMenu.controller.js";

const router = express.Router();

router.get("/", GroupMenuController.getAll);
router.get("/:id/detail", GroupMenuController.detail);
router.post("/:id/assign-menus", GroupMenuController.assignMenus);
router.get("/:id", GroupMenuController.getById);
router.post("/", GroupMenuController.create);
router.put("/:id", GroupMenuController.update);
router.post("/toggle-status", GroupMenuController.toggleStatus);

export default router;

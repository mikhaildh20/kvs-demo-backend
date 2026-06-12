import express from "express";
import { MenuController } from "../controllers/menu.controller.js";

const router = express.Router();

router.get("/", MenuController.getAll);
router.post("/toggle-status", MenuController.toggleStatus);
router.get("/:id", MenuController.getById);
router.post("/", MenuController.create);
router.put("/:id", MenuController.update);

export default router;

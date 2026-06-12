import express from "express";
import { LineController } from "../controllers/line.controller.js";

const router = express.Router();

router.get("/", LineController.getAll);
router.get("/:id/detail", LineController.detail);
router.post("/:id/assign-users", LineController.assignUsers);
router.post("/toggle-status", LineController.toggleStatus);
router.get("/:id", LineController.getById);
router.post("/", LineController.create);
router.put("/:id", LineController.update);
router.delete("/:id", LineController.delete);

export default router;

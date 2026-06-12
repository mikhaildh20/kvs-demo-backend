import express from "express";
import { ActionLogController } from "../controllers/actionLog.controller.js";

const router = express.Router();

router.get("/", ActionLogController.getAll);
router.get("/:id", ActionLogController.getById);
router.post("/", ActionLogController.create);

export default router;

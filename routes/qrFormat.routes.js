import express from "express";
import { QrFormatController } from "../controllers/qrFormat.controller.js";

const router = express.Router();

router.get("/", QrFormatController.getAll);
router.get("/:id/detail", QrFormatController.detail);
router.post("/:id/assign-customers", QrFormatController.assignCustomers);
router.get("/:id", QrFormatController.getById);
router.post("/", QrFormatController.create);
router.put("/:id", QrFormatController.update);
router.post("/toggle-status", QrFormatController.toggleStatus);

export default router;

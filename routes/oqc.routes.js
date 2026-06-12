import express from "express";
import { OQCController } from "../controllers/oqc.controller.js";

const router = express.Router();

router.get("/", OQCController.getAll);
router.get("/:id", OQCController.getById);
router.get("/:id/preview", OQCController.previewById);
router.post("/preview", OQCController.preview);
router.post("/", OQCController.create);

export default router;

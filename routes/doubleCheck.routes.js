import express from "express";
import { DoubleCheckController } from "../controllers/doubleCheck.controller.js";

const router = express.Router();

router.get("/access", DoubleCheckController.access);
router.get("/report", DoubleCheckController.report);
router.get("/summary", DoubleCheckController.summary);
router.post("/scan", DoubleCheckController.scan);
router.post("/submit", DoubleCheckController.submit);

export default router;

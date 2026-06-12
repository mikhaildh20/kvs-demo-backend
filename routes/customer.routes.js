import express from "express";
import { CustomerController } from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/", CustomerController.getAll);
router.get("/:id/detail", CustomerController.detail);
router.post("/:id/assign-kanbans", CustomerController.assignKanbans);
router.get("/:id", CustomerController.getById);
router.post("/", CustomerController.create);
router.put("/:id", CustomerController.update);
router.post("/toggle-status", CustomerController.toggleStatus);

export default router;

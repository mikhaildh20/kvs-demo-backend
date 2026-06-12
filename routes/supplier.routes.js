import express from "express";
import { SupplierController } from "../controllers/supplier.controller.js";

const router = express.Router();

router.get("/", SupplierController.getAll);
router.get("/:id/detail", SupplierController.detail);
router.post("/:id/assign-customers", SupplierController.assignCustomers);
router.get("/:id", SupplierController.getById);
router.post("/", SupplierController.create);
router.put("/:id", SupplierController.update);
router.post("/toggle-status", SupplierController.toggleStatus);

export default router;

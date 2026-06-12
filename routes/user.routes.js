import express from "express";
import { UserController } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", UserController.getAll);
router.get("/roles", UserController.getRoleOptions);
router.get("/:id", UserController.getById);
router.post("/", UserController.create);
router.put("/:id", UserController.update);
router.post("/toggle-status", UserController.toggleStatus);
router.post("/reset-password", UserController.resetPassword);
router.post("/unlock", UserController.unlock);

export default router;

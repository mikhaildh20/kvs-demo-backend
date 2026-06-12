import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/seed-user", AuthController.seedUser);
router.post("/login", AuthController.login);
router.post("/change-password-self", AuthController.changePasswordSelf);
router.get("/me", authenticate, AuthController.me);
router.get("/session", authenticate, AuthController.session);

export default router;

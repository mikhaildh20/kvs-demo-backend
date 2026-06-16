import express from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

const authMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post("/seed-user", authMutationLimiter, AuthController.seedUser);
router.post("/login", authMutationLimiter, AuthController.login);
router.post("/change-password-self", authMutationLimiter, AuthController.changePasswordSelf);
router.get("/me", authenticate, AuthController.me);
router.get("/session", authenticate, AuthController.session);

export default router;

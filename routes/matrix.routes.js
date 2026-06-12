import express from "express";
import { MatrixController } from "../controllers/matrix.controller.js";

const router = express.Router();

router.get("/", MatrixController.getAll);
router.get(
    "/generate-lot",
    MatrixController.generateLot
);

export default router;
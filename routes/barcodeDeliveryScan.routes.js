import express from "express";
import upload from "../middlewares/upload.middleware.js";
import { BarcodeDeliveryScanController } from "../controllers/barcodeDeliveryScan.controller.js";

const router = express.Router();

const importUpload = upload.single("file");

router.get("/", BarcodeDeliveryScanController.getAll);
router.get("/report", BarcodeDeliveryScanController.report);
router.get("/report/:id", BarcodeDeliveryScanController.reportDetail);

router.post("/import", (req, res, next) => {
  importUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        data: null,
        error: true,
        message: err.code === "LIMIT_FILE_SIZE" ? "The Excel file is too large. Maximum file size is 25 MB." : err.message,
      });
    }

    return next();
  });
}, BarcodeDeliveryScanController.importExcel);

router.get("/po-options", BarcodeDeliveryScanController.poOptions);
router.get("/kanban-options", BarcodeDeliveryScanController.kanbanOptions);
router.get("/target/:id", BarcodeDeliveryScanController.target);
router.post("/resolve-pik", BarcodeDeliveryScanController.resolvePik);
router.post("/scan", BarcodeDeliveryScanController.scan);

export default router;

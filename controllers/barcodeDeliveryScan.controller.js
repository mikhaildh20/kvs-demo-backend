import { BarcodeDeliveryScanService } from "../services/barcodeDeliveryScan.service.js";
import { error, success } from "../response/DtoResponse.js";

const statusOf = (err, fallback = 400) => err.statusCode || fallback;

const getImportErrorMessage = (err) => {
  const message = String(err?.message || "");
  const lower = message.toLowerCase();

  if (!message) return "Failed to import barcode delivery scan data. Check the Excel file and try again.";
  if (lower.includes("excel file is required")) return "Choose an Excel file first.";
  if (lower.includes("missing columns")) return message;
  if (lower.includes("unsupported file type")) return "Only Excel .xlsx files are allowed for barcode delivery scan import.";
  if (lower.includes("file") && (lower.includes("size") || lower.includes("limit") || lower.includes("maximum"))) {
    return "The Excel file is too large. Maximum file size is 25 MB.";
  }
  if (lower.includes("invalid file") || lower.includes("worksheet") || lower.includes("zip") || lower.includes("end of central directory")) {
    return "The Excel file could not be read. Make sure you upload a valid .xlsx template.";
  }
  if (
    lower.includes("prisma") ||
    lower.includes("constraint") ||
    lower.includes("stack") ||
    lower.includes("trace") ||
    message.length > 140
  ) {
    return "Failed to import barcode delivery scan data. Check the Excel content and try again.";
  }

  return message;
};

export const BarcodeDeliveryScanController = {
  async getAll(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getAll(req.query || {});
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async importExcel(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.importExcel(req.file, req.user);
      return res.json(success(data, "Barcode delivery scan imported successfully"));
    } catch (err) {
      return res.status(statusOf(err)).json(error(getImportErrorMessage(err)));
    }
  },

  async report(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getPoReport(req.query || {});
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async reportDetail(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getPoReportDetail(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async poOptions(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getPoOptions(req.query || {});
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async kanbanOptions(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getKanbanOptions(req.query || {});
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async target(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.getScanTarget(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err)).json(error(err.message));
    }
  },

  async resolvePik(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.resolvePik(req.body || {}, req.user);
      return res.json(success(data, "PIK barcode resolved"));
    } catch (err) {
      return res.status(statusOf(err)).json(error(err.message));
    }
  },

  async scan(req, res) {
    try {
      const data = await BarcodeDeliveryScanService.submitScan(req.body || {}, req.user);
      return res.json(success(data, data.Status === 1 ? "Kanban delivery scan completed" : "Kanban delivery scan saved"));
    } catch (err) {
      return res.status(statusOf(err)).json(error(err.message));
    }
  },
};

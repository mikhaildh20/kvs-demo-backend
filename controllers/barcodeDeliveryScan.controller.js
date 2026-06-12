import { BarcodeDeliveryScanService } from "../services/barcodeDeliveryScan.service.js";
import { error, success } from "../response/DtoResponse.js";

const statusOf = (err, fallback = 400) => err.statusCode || fallback;

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
      return res.status(statusOf(err)).json(error(err.message));
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

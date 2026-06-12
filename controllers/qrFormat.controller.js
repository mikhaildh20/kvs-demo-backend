import { QrFormatService } from "../services/qrFormat.service.js";
import { error, success } from "../response/DtoResponse.js";

export const QrFormatController = {
  async getAll(req, res) {
    try {
      const data = await QrFormatService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await QrFormatService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async detail(req, res) {
    try {
      const data = await QrFormatService.getDetail(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await QrFormatService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "QR format created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await QrFormatService.update(req.params.id, req.body, req.user.fullname);
      return res.json(success(data, "QR format updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await QrFormatService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "QR format status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async assignCustomers(req, res) {
    try {
      const data = await QrFormatService.assignCustomers(req.params.id, req.body || {}, req.user.fullname);
      return res.json(success(data, "QR format customer data saved successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

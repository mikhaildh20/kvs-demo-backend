import { OQCService } from "../services/oqc.service.js";
import { error, success } from "../response/DtoResponse.js";

export const OQCController = {
  async getAll(req, res) {
    try {
      const data = await OQCService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await OQCService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await OQCService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "OQC created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async preview(req, res) {
    try {
      const data = await OQCService.previewLabels(req.body || {}, req.user.fullname);
      return res.json(success(data, "OQC preview generated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async previewById(req, res) {
    try {
      const data = await OQCService.previewByOqcId(req.params.id, req.user.fullname);
      return res.json(success(data, "OQC print preview generated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

import { LineService } from "../services/line.service.js";
import { error, success } from "../response/DtoResponse.js";

export const LineController = {
  async getAll(req, res) {
    try {
      const data = await LineService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await LineService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async detail(req, res) {
    try {
      const data = await LineService.getDetail(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await LineService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "Line created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await LineService.update(req.params.id, req.body, req.user.fullname);
      return res.json(success(data, "Line updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async delete(req, res) {
    try {
      const data = await LineService.delete(req.params.id, req.user.fullname);
      return res.json(success(data, "Line disabled"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await LineService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "Line status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async assignUsers(req, res) {
    try {
      const data = await LineService.assignUsers(req.params.id, req.body || {}, req.user.fullname);
      return res.json(success(data, "Line user data saved successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

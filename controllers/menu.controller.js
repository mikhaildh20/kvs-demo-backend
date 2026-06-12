import { MenuService } from "../services/menu.service.js";
import { error, success } from "../response/DtoResponse.js";

export const MenuController = {
  async getAll(req, res) {
    try {
      const data = await MenuService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await MenuService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await MenuService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "Menu created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await MenuService.update(req.params.id, req.body, req.user.fullname);
      return res.json(success(data, "Menu updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await MenuService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "Menu status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

import { ActionLogService } from "../services/actionLog.service.js";
import { error, success } from "../response/DtoResponse.js";

export const ActionLogController = {
  async getAll(req, res) {
    try {
      const data = await ActionLogService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await ActionLogService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(404).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await ActionLogService.create(req.body || {}, {
        menuId: req.menuId,
        userFullname: req.user.fullname,
      });
      return res.status(201).json(success(data, "Action log created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

import { GroupMenuService } from "../services/groupMenu.service.js";
import { error, success } from "../response/DtoResponse.js";

export const GroupMenuController = {
  async getAll(req, res) {
    try {
      const data = await GroupMenuService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await GroupMenuService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async detail(req, res) {
    try {
      const data = await GroupMenuService.getDetail(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await GroupMenuService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "Group menu created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await GroupMenuService.update(req.params.id, req.body, req.user.fullname);
      return res.json(success(data, "Group menu updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await GroupMenuService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "Group menu status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async assignMenus(req, res) {
    try {
      const data = await GroupMenuService.assignMenus(req.params.id, req.body || {}, req.user.fullname);
      return res.json(success(data, "Group menu data saved successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

import { UserService } from "../services/user.service.js";
import { error, success } from "../response/DtoResponse.js";

export const UserController = {
  async getAll(req, res) {
    try {
      const data = await UserService.getAll(req.query, req.user);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await UserService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async getRoleOptions(req, res) {
    try {
      const data = await UserService.getRoleOptions();
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await UserService.create(req.body || {}, req.user.fullname);
      return res.status(201).json(success(data, "User created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await UserService.update(req.params.id, req.body || {}, req.user.fullname);
      return res.json(success(data, "User updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await UserService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "User status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async resetPassword(req, res) {
    try {
      const data = await UserService.resetPassword(req.body.id, req.user.fullname);
      return res.json(success(data, "Password reset successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async unlock(req, res) {
    try {
      const data = await UserService.unlock(req.body.id, req.user.fullname);
      return res.json(success(data, "User unlocked successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

import { RoleService } from "../services/role.service.js";
import { error, success } from "../response/DtoResponse.js";

export const RoleController = {
    async getAll(req, res) {
        try {
            const data = await RoleService.getAll(req.query);
            return res.json(success(data));
        } catch (err) {
            return res.status(500).json(error(err.message));
        }
    },

    async getById(req, res) {
        try {
            const data = await RoleService.getById(req.params.id);
            return res.json(success(data));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async detail(req, res) {
        try {
            const data = await RoleService.getDetail(req.params.id);
            return res.json(success(data));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async create(req, res) {
        try {
            const data = await RoleService.create(req.body, req.user.fullname);
            return res.status(201).json(success(data, "Role created"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async update(req, res) {
        try {
            const data = await RoleService.update(req.params.id, req.body, req.user.fullname);
            return res.json(success(data, "Role updated"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async toggleStatus(req, res) {
        try {
            const data = await RoleService.toggleStatus(req.body.id, req.user.fullname);
            return res.json(success(data, "Role status updated successfully"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async assignMenus(req, res) {
        try {
            const data = await RoleService.assignMenus(req.params.id, req.body || {}, req.user.fullname);
            return res.json(success(data, "Role menu data saved successfully"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },
};

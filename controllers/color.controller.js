import { ColorService } from "../services/color.service.js";
import { error, success } from "../response/DtoResponse.js";

export const ColorController = {
    async getAll(req, res) {
        try {
            const data = await ColorService.getAll(req.query);
            return res.json(success(data));
        } catch (err) {
            return res.status(500).json(error(err.message));
        }

    },

    async getById(req, res) {
        try {
            const data = await ColorService.getById(req.params.id);
            return res.json(success(data));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async create(req, res) {
        try {
            const data = await ColorService.create(req.body, req.user.fullname);
            return res.status(201).json(success(data, "Color created"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async update(req, res) {
        try {
            const data = await ColorService.update(req.params.id, req.body, req.user.fullname);
            return res.json(success(data, "Color updated"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async toggleStatus(req, res) {
        try {
            const data = await ColorService.toggleStatus(req.body.id, req.user.fullname);
            return res.json(success(data, "Color status updated successfully"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },
};
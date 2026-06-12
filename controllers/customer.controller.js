import { CustomerService } from "../services/customer.service.js";
import { error, success } from "../response/DtoResponse.js";

export const CustomerController = {
    async getAll(req, res) {
        try {
            const data = await CustomerService.getAll(req.query);
            return res.json(success(data));
        } catch (err) {
            return res.status(500).json(error(err.message));
        }
    },

    async getById(req, res) {
        try {
            const data = await CustomerService.getById(req.params.id);
            return res.json(success(data));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async detail(req, res) {
        try {
            const data = await CustomerService.getDetail(req.params.id);
            return res.json(success(data));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async create(req, res) {
        try {
            const data = await CustomerService.create(req.body, req.user.fullname);
            return res.status(201).json(success(data, "Customer created"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async update(req, res) {
        try {
            const data = await CustomerService.update(req.params.id, req.body, req.user.fullname);
            return res.json(success(data, "Customer updated"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async toggleStatus(req, res) {
        try {
            const data = await CustomerService.toggleStatus(req.body.id, req.user.fullname);
            return res.json(success(data, "Customer status updated successfully"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },

    async assignKanbans(req, res) {
        try {
            const data = await CustomerService.assignKanbans(req.params.id, req.body || {}, req.user.fullname);
            return res.json(success(data, "Customer kanban data saved successfully"));
        } catch (err) {
            return res.status(400).json(error(err.message));
        }
    },
};

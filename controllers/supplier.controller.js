import { SupplierService } from "../services/supplier.service.js";
import { error, success } from "../response/DtoResponse.js";

export const SupplierController = {
  async getAll(req, res) {
    try {
      const data = await SupplierService.getAll(req.query);
      return res.json(success(data));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },

  async getById(req, res) {
    try {
      const data = await SupplierService.getById(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async detail(req, res) {
    try {
      const data = await SupplierService.getDetail(req.params.id);
      return res.json(success(data));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async create(req, res) {
    try {
      const data = await SupplierService.create(req.body, req.user.fullname);
      return res.status(201).json(success(data, "Supplier created"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async update(req, res) {
    try {
      const data = await SupplierService.update(req.params.id, req.body, req.user.fullname);
      return res.json(success(data, "Supplier updated"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async toggleStatus(req, res) {
    try {
      const data = await SupplierService.toggleStatus(req.body.id, req.user.fullname);
      return res.json(success(data, "Supplier status updated successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async assignCustomers(req, res) {
    try {
      const data = await SupplierService.assignCustomers(req.params.id, req.body || {}, req.user.fullname);
      return res.json(success(data, "Supplier customer data saved successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },
};

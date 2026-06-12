import { SupplierModel } from "../models/supplier.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid supplier id");
  }

  return id;
};

const mapSupplier = (supplier) => ({
  Id: supplier.spl_id,
  Code: supplier.spl_code,
  Status: supplier.spl_status,
});

const mapCustomer = (customer) => ({
  Id: customer.cst_id,
  Code: customer.cst_code,
  Name: customer.cst_name,
  SupplierId: customer.spl_id,
  Status: customer.cst_status,
});

export const SupplierService = {
  async getAll(query) {
    const result = await SupplierModel.findPaged(query);

    return {
      data: result.data.map(mapSupplier),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const supplier = await SupplierModel.findById(resolveId(rawId));

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return mapSupplier(supplier);
  },

  async getDetail(rawId) {
    const supplierId = resolveId(rawId);
    const [supplier, customers] = await Promise.all([
      SupplierModel.findById(supplierId),
      SupplierModel.findAssignableCustomers(supplierId),
    ]);

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const mappedCustomers = customers.map(mapCustomer);

    return {
      supplier: mapSupplier(supplier),
      customers: mappedCustomers,
      assignedCustomerIds: mappedCustomers
        .filter((item) => item.SupplierId === supplierId)
        .map((item) => item.Id),
    };
  },

  async create(payload, userId) {
    if (!payload.code?.trim()) {
      throw new Error("Supplier code is required");
    }

    return mapSupplier(await SupplierModel.create(payload, userId));
  },

  async update(rawId, payload, userId) {
    if (!payload.code?.trim()) {
      throw new Error("Supplier code is required");
    }

    return mapSupplier(await SupplierModel.update(resolveId(rawId), payload, userId));
  },

  async toggleStatus(rawId, userId) {
    return mapSupplier(await SupplierModel.toggleStatus(resolveId(rawId), userId));
  },

  async assignCustomers(rawId, payload, userId) {
    const supplierId = resolveId(rawId);
    const customerIds = Array.isArray(payload.customerIds) ? payload.customerIds : [];
    const result = await SupplierModel.assignCustomers(supplierId, customerIds, userId);

    return {
      assigned: result.assigned,
      unassigned: result.unassigned,
    };
  },
};

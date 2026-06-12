import { CustomerModel } from "../models/customer.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
    const decrypted = decryptIdUrl(value);
    const id = Number(decrypted || value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid customer id");
    }

    return id;
};

const mapCustomer = (customer) => ({
    Id: customer.cst_id,
    Code: customer.cst_code,
    Name: customer.cst_name,
    SupplierId: customer.spl_id,
    SupplierCode: customer.mst_suppliers?.spl_code || "-",
    PhotoPath: customer.cst_photo_path,
    Status: customer.cst_status,
});

const mapUnassignedKanban = (kanban) => ({
    Id: kanban.kbn_no,
    UniqNo: kanban.kbn_uniq_no || "-",
    QtyBox: Number(kanban.kbn_qty_box) || 0,
    ColorName: kanban.mst_colors?.clr_name || "-",
    Special: kanban.kbn_isSpecial,
    Status: kanban.kbn_status,
    CustomerId: kanban.cst_id,
});

export const CustomerService = {
    async getAll(query) {
        const result = await CustomerModel.findPaged(query);
        return {
            data: result.data.map(mapCustomer),
            totalData: result.totalData,
        };
    },

    async getById(rawId) {
        const customer = await CustomerModel.findById(resolveId(rawId));

        if (!customer) {
            throw new Error("Customer not found");
        }

        return mapCustomer(customer);
    },

    async getDetail(rawId) {
        const customerId = resolveId(rawId);
        const [customer, kanbans] = await Promise.all([
            CustomerModel.findById(customerId),
            CustomerModel.findAssignableKanbans(customerId),
        ]);

        if (!customer) {
            throw new Error("Customer not found");
        }

        return {
            customer: mapCustomer(customer),
            assignedKanbanIds: kanbans.filter((kanban) => Number(kanban.cst_id) === Number(customerId)).map((kanban) => kanban.kbn_no),
            kanbans: kanbans.map(mapUnassignedKanban),
            unassignedKanbans: kanbans.map(mapUnassignedKanban),
        };
    },

    async create(payload, userId) {
        if (!payload.code?.trim()) {
            throw new Error("Customer code is required");
        }

        if (!payload.name?.trim()) {
            throw new Error("Customer name is required");
        }

        return mapCustomer(await CustomerModel.create(payload, userId));
    },

    async update(rawId, payload, userId) {
        if (!payload.code?.trim()) {
            throw new Error("Customer code is required");
        }

        if (!payload.name?.trim()) {
            throw new Error("Customer name is required");
        }

        return mapCustomer(await CustomerModel.update(resolveId(rawId), payload, userId));
    },

    async toggleStatus(rawId, userId) {
        return mapCustomer(await CustomerModel.toggleStatus(resolveId(rawId), userId));
    },

    async assignKanbans(rawId, payload, userId) {
        const customerId = resolveId(rawId);
        const kanbanIds = Array.isArray(payload.kanbanIds) ? payload.kanbanIds : [];

        if (kanbanIds.length === 0) {
            throw new Error("Choose at least one kanban");
        }

        const result = await CustomerModel.assignKanbans(customerId, kanbanIds, userId);

        return {
            assigned: result.count,
        };
    },

};

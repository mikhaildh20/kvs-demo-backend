import { QrFormatModel } from "../models/qrFormat.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";
import { validateQrPattern } from "../utils/qrFormatValidator.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid QR format id");
  }

  return id;
};

const mapQrFormat = (qr) => ({
  Id: qr.qfm_id,
  Name: qr.qfm_name,
  Pattern: qr.qfm_pattern,
  SeqLength: qr.qfm_seq_length,
  Status: qr.qfm_status,
});

const mapCustomer = (customer) => ({
  Id: customer.cst_id,
  Code: customer.cst_code,
  Name: customer.cst_name,
  QrFormatId: customer.qfm_id,
  Status: customer.cst_status,
});

const validatePayload = (payload) => {
  if (!payload.name?.trim()) {
    throw new Error("QR format name is required");
  }

  if (!payload.pattern?.trim()) {
    throw new Error("QR format pattern is required");
  }

  const seqLength = Number(payload.seqLength ?? 4);
  if (!Number.isInteger(seqLength) || seqLength <= 0) {
    throw new Error("QR sequence length must be a positive integer");
  }

  validateQrPattern(payload.pattern);
};

export const QrFormatService = {
  async getAll(query) {
    const result = await QrFormatModel.findPaged(query);
    return {
      data: result.data.map(mapQrFormat),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const qr = await QrFormatModel.findById(resolveId(rawId));
    if (!qr) {
      throw new Error("QR format not found");
    }

    return mapQrFormat(qr);
  },

  async getDetail(rawId) {
    const qrFormatId = resolveId(rawId);
    const [qr, customers] = await Promise.all([
      QrFormatModel.findById(qrFormatId),
      QrFormatModel.findAssignableCustomers(qrFormatId),
    ]);

    if (!qr) {
      throw new Error("QR format not found");
    }

    const mappedCustomers = customers.map(mapCustomer);

    return {
      qrFormat: mapQrFormat(qr),
      customers: mappedCustomers,
      assignedCustomerIds: mappedCustomers
        .filter((item) => item.QrFormatId === qrFormatId)
        .map((item) => item.Id),
    };
  },

  async create(payload, userId) {
    validatePayload(payload);
    return mapQrFormat(await QrFormatModel.create(payload, userId));
  },

  async update(rawId, payload, userId) {
    validatePayload(payload);
    return mapQrFormat(await QrFormatModel.update(resolveId(rawId), payload, userId));
  },

  async toggleStatus(rawId, userId) {
    return mapQrFormat(await QrFormatModel.toggleStatus(resolveId(rawId), userId));
  },

  async assignCustomers(rawId, payload, userId) {
    const qrFormatId = resolveId(rawId);
    const customerIds = Array.isArray(payload.customerIds) ? payload.customerIds : [];
    const result = await QrFormatModel.assignCustomers(qrFormatId, customerIds, userId);

    return {
      assigned: result.assigned,
      unassigned: result.unassigned,
    };
  },
};

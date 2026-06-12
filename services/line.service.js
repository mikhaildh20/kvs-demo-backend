import { LineModel } from "../models/line.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid line id");
  }

  return id;
};

const mapLine = (line) => ({
  Id: line.lin_id,
  Code: line.lin_code,
  Status: line.lin_status,
});

const mapUser = (user) => ({
  Id: user.usr_id,
  Fullname: user.usr_fullname,
  Username: user.usr_username,
  Status: user.usr_status,
});

export const LineService = {
  async getAll(query) {
    const result = await LineModel.findPaged(query);
    return {
      data: result.data.map(mapLine),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const line = await LineModel.findById(resolveId(rawId));

    if (!line) {
      throw new Error("Line not found");
    }

    return mapLine(line);
  },

  async create(payload, userId) {
    if (!payload.code?.trim()) {
      throw new Error("Line code is required");
    }

    return mapLine(await LineModel.create(payload, userId));
  },

  async update(rawId, payload, userId) {
    if (!payload.code?.trim()) {
      throw new Error("Line code is required");
    }

    return mapLine(await LineModel.update(resolveId(rawId), payload, userId));
  },

  async delete(rawId, userId) {
    return mapLine(await LineModel.delete(resolveId(rawId), userId));
  },

  async toggleStatus(rawId, userId) {
    return mapLine(await LineModel.toggleStatus(resolveId(rawId), userId));
  },

  async getDetail(rawId) {
    const lineId = resolveId(rawId);
    const [line, users, assignedUserIds] = await Promise.all([
      LineModel.findById(lineId),
      LineModel.findAvailableUsersByLine(lineId),
      LineModel.findAssignedUserIds(lineId),
    ]);

    if (!line) {
      throw new Error("Line not found");
    }

    return {
      line: mapLine(line),
      users: users.map(mapUser),
      assignedUserIds,
    };
  },

  async assignUsers(rawId, payload, userId) {
    const lineId = resolveId(rawId);
    const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
    const result = await LineModel.assignUsers(lineId, userIds, userId);

    return {
      assigned: result.count,
    };
  },
};

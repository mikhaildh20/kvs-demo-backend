import { ActionLogModel } from "../models/actionLog.model.js";

const normalizeTextValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const mapLog = (log) => ({
  Id: log.acl_id,
  MenuId: log.mnu_id,
  MenuName: log.mst_menus?.mnu_name || "-",
  MenuPath: log.mst_menus?.mnu_path || "-",
  Action: log.acl_action,
  OldValue: log.acl_old,
  NewValue: log.acl_new,
  CreatedDate: log.acl_creadate,
  CreatedBy: log.acl_creaby,
});

const resolveMenuId = async (payload, requestMenuId) => {
  if (payload.menuId) {
    return Number(payload.menuId);
  }

  if (payload.menuPath) {
    const menu = await ActionLogModel.findMenuByPath(payload.menuPath);
    if (!menu) {
      throw new Error("Menu not found");
    }
    return menu.mnu_id;
  }

  if (requestMenuId) {
    return Number(requestMenuId);
  }

  throw new Error("Menu is required for action log");
};

export const ActionLogService = {
  async getAll(query) {
    const result = await ActionLogModel.findPaged(query);
    return {
      data: result.data.map(mapLog),
      totalData: result.totalData,
    };
  },

  async getById(id) {
    const log = await ActionLogModel.findById(id);
    if (!log) {
      throw new Error("Action log not found");
    }

    return mapLog(log);
  },

  async create(payload, context) {
    if (!payload.action?.trim()) {
      throw new Error("Action is required");
    }

    const menuId = await resolveMenuId(payload, context.menuId);
    const data = await ActionLogModel.create(
      {
        menuId,
        action: payload.action.trim(),
        oldValue: normalizeTextValue(payload.oldValue ?? payload.old),
        newValue: normalizeTextValue(payload.newValue ?? payload.new),
      },
      context.userFullname
    );

    return mapLog(data);
  },
};

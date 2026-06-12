import { GroupMenuModel } from "../models/groupMenu.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid group menu id");
  }

  return id;
};

const mapGroupMenu = (row) => ({
  Id: row.grm_id,
  Name: row.grm_name,
  Status: row.grm_status,
});

const mapMenu = (menu) => ({
  Id: menu.mnu_id,
  Name: menu.mnu_name,
  Path: menu.mnu_path,
  Icon: menu.mnu_icon,
  Status: menu.mnu_status,
  GroupId: menu.grm_id,
});

export const GroupMenuService = {
  async getAll(query) {
    const result = await GroupMenuModel.findPaged(query);
    return {
      data: result.data.map(mapGroupMenu),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const row = await GroupMenuModel.findById(resolveId(rawId));
    if (!row) throw new Error("Group menu not found");
    return mapGroupMenu(row);
  },

  async create(payload, userId) {
    if (!payload.name?.trim()) throw new Error("Group menu name is required");
    return mapGroupMenu(await GroupMenuModel.create(payload, userId));
  },

  async update(rawId, payload, userId) {
    if (!payload.name?.trim()) throw new Error("Group menu name is required");
    return mapGroupMenu(await GroupMenuModel.update(resolveId(rawId), payload, userId));
  },

  async toggleStatus(rawId, userId) {
    return mapGroupMenu(await GroupMenuModel.toggleStatus(resolveId(rawId), userId));
  },

  async getDetail(rawId) {
    const groupId = resolveId(rawId);
    const [groupMenu, menus, assignedMenuIds] = await Promise.all([
      GroupMenuModel.findById(groupId),
      GroupMenuModel.findAllMenus(),
      GroupMenuModel.findAssignedMenuIds(groupId),
    ]);

    if (!groupMenu) throw new Error("Group menu not found");

    return {
      groupMenu: mapGroupMenu(groupMenu),
      menus: menus.map(mapMenu),
      assignedMenuIds,
    };
  },

  async assignMenus(rawId, payload, userId) {
    const groupId = resolveId(rawId);
    const menuIds = Array.isArray(payload.menuIds) ? payload.menuIds : [];
    const result = await GroupMenuModel.assignMenus(groupId, menuIds, userId);

    return {
      assigned: result.count,
    };
  },
};

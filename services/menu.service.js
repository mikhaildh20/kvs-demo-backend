import prisma from "../models/prisma.js";
import { MenuModel } from "../models/menu.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid menu id");
  }

  return id;
};

const mapMenu = (menu) => ({
  Id: menu.mnu_id,
  Name: menu.mnu_name,
  Path: menu.mnu_path,
  Icon: menu.mnu_icon,
  Status: menu.mnu_status,
});

const validatePayload = (payload) => {
  if (!payload.name?.trim()) {
    throw new Error("Menu name is required");
  }

  if (!payload.path?.trim()) {
    throw new Error("Menu path is required");
  }

  if (!payload.path.startsWith("/pages/")) {
    throw new Error("Menu path must start with /pages/");
  }

  if (payload.path.trim() === "/pages/") {
    throw new Error("Menu folder is required");
  }
};

export const MenuService = {
  async getMenuRowsByRole(roleId) {
    const rows = await prisma.detail_menu.findMany({
      where: {
        rol_id: roleId,
        dtm_status: 1,
        mst_menus: {
          mnu_status: 1,
          mnu_path: {
            not: null,
          },
        },
      },
      include: {
        mst_menus: {
          include: {
            mst_group_menu: true,
          },
        },
      },
      orderBy: {
        mnu_id: "asc",
      },
    });

    return rows;
  },

  async getMenusByRole(roleId) {
    const rows = await this.getMenuRowsByRole(roleId);

    return rows
      .map((row) => row.mst_menus)
      .filter((menu) => {
        const path = String(menu?.mnu_path || "").trim();
        return /^\/pages\/[^/]+$/.test(path);
      })
      .map((menu) => ({
        id: menu.mnu_id,
        name: menu.mnu_name,
        path: menu.mnu_path,
        icon: menu.mnu_icon || "FaCircle",
        groupId: menu.grm_id,
        groupName: menu.mst_group_menu?.grm_name || "Ungrouped",
      }));
  },

  async getAccessPathsByRole(roleId) {
    const rows = await this.getMenuRowsByRole(roleId);

    return rows
      .map((row) => row.mst_menus?.mnu_path)
      .filter(Boolean);
  },

  async getAll(query) {
    const result = await MenuModel.findPaged(query);
    return {
      data: result.data.map(mapMenu),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const menu = await MenuModel.findById(resolveId(rawId));

    if (!menu) {
      throw new Error("Menu not found");
    }

    return mapMenu(menu);
  },

  async create(payload, userFullname) {
    validatePayload(payload);

    return mapMenu(await MenuModel.create(payload, userFullname));
  },

  async update(rawId, payload, userFullname) {
    validatePayload(payload);

    return mapMenu(await MenuModel.update(resolveId(rawId), payload, userFullname));
  },

  async toggleStatus(rawId, userFullname) {
    return mapMenu(await MenuModel.toggleStatus(resolveId(rawId), userFullname));
  },
};

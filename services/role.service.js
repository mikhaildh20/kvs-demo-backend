import { RoleModel } from "../models/role.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
    const decrypted = decryptIdUrl(value);
    const id = Number(decrypted || value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid role id");
    }

    return id;
};

const mapRole = (role) => ({
    Id: role.rol_id,
    Name: role.rol_name,
    Status: role.rol_status,
});

const mapMenu = (menu) => ({
    Id: menu.mnu_id,
    Name: menu.mnu_name,
    Path: menu.mnu_path,
    Icon: menu.mnu_icon,
    Status: menu.mnu_status,
});

export const RoleService = {
    async getAll(query) {
        const result = await RoleModel.findPaged(query);
        return {
            data: result.data.map(mapRole),
            totalData: result.totalData,
        };
    },

    async getById(rawId) {
        const role = await RoleModel.findById(resolveId(rawId));

        if (!role) {
            throw new Error("Role not found");
        }

        return mapRole(role);
    },

    async create(payload, userId) {
        if (!payload.name?.trim()) {
            throw new Error("Role name is required");
        }

        return mapRole(await RoleModel.create(payload, userId));
    },

    async update(rawId, payload, userId) {
        if (!payload.name?.trim()) {
            throw new Error("Role name is required");
        }

        return mapRole(await RoleModel.update(resolveId(rawId), payload, userId));
    },

    async toggleStatus(rawId, userId) {
        return mapRole(await RoleModel.toggleStatus(resolveId(rawId), userId));
    },

    async getDetail(rawId) {
        const roleId = resolveId(rawId);
        const [role, menus, assignedMenuIds] = await Promise.all([
            RoleModel.findById(roleId),
            RoleModel.findAllMenus(),
            RoleModel.findAssignedMenuIds(roleId),
        ]);

        if (!role) {
            throw new Error("Role not found");
        }

        return {
            role: mapRole(role),
            menus: menus.map(mapMenu),
            assignedMenuIds,
        };
    },

    async assignMenus(rawId, payload, userId) {
        const roleId = resolveId(rawId);
        const menuIds = Array.isArray(payload.menuIds) ? payload.menuIds : [];
        const result = await RoleModel.assignMenus(roleId, menuIds, userId);

        return {
            assigned: result.count,
        };
    },
};

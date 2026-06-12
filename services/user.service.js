import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  return id;
};

const generatePassword = (length = 12) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
};

const validateUsernameFormat = (username) => {
  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    throw new Error("Username can only contain letters, numbers, dot, dash, and underscore. Spaces are not allowed.");
  }
};

const mapUser = (user) => ({
  Id: user.usr_id,
  RoleId: user.rol_id,
  RoleName: user.mst_roles?.rol_name || "-",
  Fullname: user.usr_fullname,
  Username: user.usr_username,
  Status: user.usr_status,
  IsLocked: user.usr_isLocked,
  IsForced: user.usr_isForced,
  Creadate: user.usr_creadate,
});

export const UserService = {
  async getAll(query, user) {
    const result = await UserModel.findPaged({
      ...query,
      ExcludeId: user?.user_id,
    });
    return {
      data: result.data.map(mapUser),
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const user = await UserModel.findById(resolveId(rawId));
    if (!user) throw new Error("User not found");
    return mapUser(user);
  },

  async getRoleOptions() {
    const rows = await UserModel.getRoleOptions();
    return rows.map((row) => ({ Id: row.rol_id, Name: row.rol_name }));
  },

  async create(payload, actor) {
    const fullname = String(payload.fullname || "").trim();
    const username = String(payload.username || "").trim();
    const roleId = Number(payload.roleId || 0);

    if (!fullname) throw new Error("Full name is required");
    if (!username) throw new Error("Username is required");
    if (!roleId) throw new Error("Role is required");
    validateUsernameFormat(username);

    const existing = await UserModel.findByUsername(username);
    if (existing) throw new Error("Username unavailable");

    const generatedPassword = generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    const created = await UserModel.create({
      rol_id: roleId,
      usr_fullname: fullname,
      usr_username: username,
      usr_password: passwordHash,
      usr_status: 1,
      usr_isForced: 1,
      usr_isLocked: 0,
      usr_creaby: actor,
    });

    return {
      user: mapUser(created),
      generatedPassword,
    };
  },

  async update(rawId, payload, actor) {
    const id = resolveId(rawId);
    const roleId = Number(payload.roleId || 0);

    if (!roleId) throw new Error("Role is required");

    const current = await UserModel.findById(id);
    if (!current) throw new Error("User not found");

    const fullname = String(payload.fullname ?? current.usr_fullname ?? "").trim();
    const username = String(payload.username ?? current.usr_username ?? "").trim();

    if (fullname !== String(current.usr_fullname || "")) {
      throw new Error("Full name cannot be changed");
    }

    if (username !== String(current.usr_username || "")) {
      const existing = await UserModel.findByUsername(username);
      if (existing && existing.usr_id !== id) throw new Error("Username unavailable");
      throw new Error("Username cannot be changed");
    }

    const updated = await UserModel.update(id, {
      rol_id: roleId,
      usr_modidate: new Date(),
      usr_modiby: actor,
    });

    return mapUser(updated);
  },

  async toggleStatus(rawId, actor) {
    const id = resolveId(rawId);
    const user = await UserModel.findById(id);
    if (!user) throw new Error("User not found");

    const updated = await UserModel.update(id, {
      usr_status: Number(user.usr_status) === 1 ? 0 : 1,
      usr_modidate: new Date(),
      usr_modiby: actor,
    });

    return mapUser(updated);
  },

  async resetPassword(rawId, actor) {
    const id = resolveId(rawId);
    const user = await UserModel.findById(id);
    if (!user) throw new Error("User not found");

    const generatedPassword = generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 12);

    const updated = await UserModel.update(id, {
      usr_password: passwordHash,
      usr_isForced: 1,
      usr_isLocked: 0,
      usr_modidate: new Date(),
      usr_modiby: actor,
    });

    return {
      user: mapUser(updated),
      generatedPassword,
    };
  },

  async unlock(rawId, actor) {
    const id = resolveId(rawId);
    const user = await UserModel.findById(id);
    if (!user) throw new Error("User not found");

    const updated = await UserModel.update(id, {
      usr_isLocked: 0,
      usr_modidate: new Date(),
      usr_modiby: actor,
    });

    return mapUser(updated);
  },

  async changeOwnPassword(payload) {
    const username = String(payload.username || "").trim();
    const currentPassword = String(payload.currentPassword || "");
    const newPassword = String(payload.newPassword || "");

    if (!username || !currentPassword || !newPassword) {
      throw new Error("Username, current password, and new password are required");
    }

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    const user = await UserModel.findByUsername(username);
    if (!user || !user.usr_password) throw new Error("Invalid username or password");

    if (Number(user.usr_status) !== 1) throw new Error("Pengguna tidak aktif");

    const valid = await bcrypt.compare(currentPassword, user.usr_password);
    if (!valid) throw new Error("Invalid username or password");

    const newHash = await bcrypt.hash(newPassword, 12);
    await UserModel.update(user.usr_id, {
      usr_password: newHash,
      usr_isForced: 0,
      usr_isLocked: 0,
      usr_modidate: new Date(),
      usr_modiby: user.usr_fullname || user.usr_username,
    });

    return { changed: true };
  },
};

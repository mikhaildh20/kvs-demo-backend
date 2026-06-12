import bcrypt from "bcrypt";
import { signAuthToken } from "../middlewares/auth.middleware.js";
import prisma from "../models/prisma.js";
import { UserService } from "./user.service.js";

const ensureRole = async (roleName = "Administrator") => {
  const role = await prisma.mst_roles.findFirst({
    where: {
      rol_name: roleName,
    },
  });

  if (role) return role;

  return prisma.mst_roles.create({
    data: {
      rol_name: roleName,
      rol_status: 1,
      rol_creaby: "seed",
    },
  });
};

export const AuthService = {
  async seedUser(payload) {
    const username = payload.username || "admin";
    const password = payload.password || process.env.AUTH_SEED_PASSWORD;
    if (!password) {
      throw new Error("Seed password is required");
    }
    const fullname = payload.name || payload.fullname || "System Administrator";
    const role = await ensureRole(payload.role || "Administrator");

    const passwordHash = await bcrypt.hash(password, 12);
    const existingUser = await prisma.mst_users.findFirst({
      where: { usr_username: username },
    });

    if (existingUser) {
      const updatedUser = await prisma.mst_users.update({
        where: { usr_id: existingUser.usr_id },
        include: {
          mst_roles: true,
        },
        data: {
          rol_id: role.rol_id,
          usr_fullname: fullname,
          usr_password: passwordHash,
          usr_status: 1,
          usr_isForced: 0,
          usr_isLocked: 0,
          usr_modidate: new Date(),
          usr_modiby: "seed",
        },
      });

      return {
        id: updatedUser.usr_id,
        name: updatedUser.usr_fullname,
        username: updatedUser.usr_username,
        role_id: updatedUser.rol_id,
        role_name: updatedUser.mst_roles?.rol_name || role.rol_name,
      };
    }

    const user = await prisma.mst_users.create({
      include: {
        mst_roles: true,
      },
      data: {
        rol_id: role.rol_id,
        usr_fullname: fullname,
        usr_username: username,
        usr_password: passwordHash,
        usr_status: 1,
        usr_isForced: 0,
        usr_isLocked: 0,
        usr_creaby: "seed",
      },
    });

    return {
      id: user.usr_id,
      name: user.usr_fullname,
      username: user.usr_username,
      role_id: user.rol_id,
      role_name: user.mst_roles?.rol_name || role.rol_name,
    };
  },

  async login({ username, password }) {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = await prisma.mst_users.findFirst({
      where: {
        usr_username: username,
      },
      include: {
        mst_roles: true,
      },
    });

    if (!user || !user.usr_password) {
      throw new Error("Invalid username or password");
    }
    if (Number(user.usr_status) !== 1) {
      throw new Error("Pengguna tidak aktif");
    }
    if (Number(user.usr_isLocked || 0) === 1) {
      throw new Error("User is locked");
    }

    const passwordValid = await bcrypt.compare(password, user.usr_password);

    if (!passwordValid) {
      throw new Error("Invalid username or password");
    }

    const authUser = {
      id: user.usr_id,
      name: user.usr_fullname,
      username: user.usr_username,
      role_id: user.rol_id,
      role_name: user.mst_roles?.rol_name || "-",
      isForced: Number(user.usr_isForced || 0),
      isLocked: Number(user.usr_isLocked || 0),
      status: Number(user.usr_status || 0),
    };

    return {
      token: signAuthToken({
        user_id: user.usr_id,
        role_id: user.rol_id,
      }),
      user: authUser,
    };
  },

  async changePasswordSelf(payload) {
    return UserService.changeOwnPassword(payload);
  },
};

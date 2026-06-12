import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { error } from "../response/DtoResponse.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 64) {
    throw new Error("JWT_SECRET must be set and at least 64 bytes");
  }

  return secret;
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json(error("Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.mst_users.findFirst({
      where: {
        usr_id: payload.user_id,
        usr_status: 1,
      },
      include: {
        mst_roles: true,
      },
    });

    if (!user) {
      return res.status(401).json(error("Invalid or expired token"));
    }

    if (Number(user.usr_isLocked || 0) === 1) {
      return res.status(403).json(error("User is locked"));
    }

    req.user = {
      user_id: user.usr_id,
      fullname: user.usr_fullname,
      username: user.usr_username,
      role_id: user.rol_id,
      role_name: user.mst_roles?.rol_name || null,
      isForced: Number(user.usr_isForced || 0),
      isLocked: Number(user.usr_isLocked || 0),
      status: Number(user.usr_status || 0),
    };
    return next();
  } catch {
    return res.status(401).json(error("Invalid or expired token"));
  }
};

export const signAuthToken = ({ user_id, role_id }) =>
  jwt.sign({ user_id, role_id }, getJwtSecret(), { expiresIn: "1d" });

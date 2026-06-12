import prisma from "../models/prisma.js";
import { error } from "../response/DtoResponse.js";
import { resolvePagePathFromRequest } from "../utils/path.js";

const RBAC_BYPASS_PATHS = new Set(["/api/auth/me"]);

const normalizePathForCompare = (value = "") =>
  String(value || "").replace(/\/+$/, "") || "/";

export const authorizeMenu = async (req, res, next) => {
  const apiPath = (req.baseUrl + req.path).replace(/\/+$/, "") || "/";

  if (RBAC_BYPASS_PATHS.has(apiPath)) {
    return next();
  }
  if (Number(req.user?.isForced || 0) === 1) {
    return res.status(403).json(error("Password must be changed first"));
  }

  const pagePath = resolvePagePathFromRequest(req);

  try {
    const menuAccessRows = await prisma.detail_menu.findMany({
      where: {
        rol_id: req.user.role_id,
        dtm_status: 1,
        mst_menus: {
          mnu_status: 1,
        },
      },
      select: {
        mnu_id: true,
        mst_menus: {
          select: {
            mnu_path: true,
          },
        },
      },
    });

    const normalizedPagePath = normalizePathForCompare(pagePath);
    const menuAccess = menuAccessRows.find(
      (row) => normalizePathForCompare(row.mst_menus?.mnu_path) === normalizedPagePath
    );

    if (!menuAccess) {
      return res.status(403).json(error("Forbidden"));
    }

    req.menuPath = pagePath;
    req.menuId = menuAccess.mnu_id;
    return next();
  } catch (err) {
    return res.status(500).json(error(err.message));
  }
};

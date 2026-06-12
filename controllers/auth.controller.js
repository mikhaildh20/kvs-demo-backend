import { AuthService } from "../services/auth.service.js";
import { MenuService } from "../services/menu.service.js";
import { error, success } from "../response/DtoResponse.js";

const isValidSeedKey = (value) => {
  const expected = process.env.AUTH_SEED_KEY;
  return Boolean(expected && value && value === expected);
};

export const AuthController = {
  async seedUser(req, res) {
    if (!isValidSeedKey(req.get("x-auth-seed-key"))) {
      return res.status(403).json(error("Invalid seed key"));
    }

    try {
      const data = await AuthService.seedUser(req.body || {});
      return res.json(success(data, "Seed user ready"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async login(req, res) {
    try {
      const data = await AuthService.login(req.body || {});
      return res.json(success(data, "Login success"));
    } catch (err) {
      return res.status(401).json(error(err.message));
    }
  },

  async changePasswordSelf(req, res) {
    try {
      const data = await AuthService.changePasswordSelf(req.body || {});
      return res.json(success(data, "Password changed successfully"));
    } catch (err) {
      return res.status(400).json(error(err.message));
    }
  },

  async me(req, res) {
    return res.json(
      success({
        id: req.user.user_id,
        name: req.user.fullname,
        fullname: req.user.fullname,
        username: req.user.username,
        role_id: req.user.role_id,
        role_name: req.user.role_name,
        isForced: req.user.isForced,
        isLocked: req.user.isLocked,
        status: req.user.status,
      })
    );
  },

  async session(req, res) {
    try {
      const user = {
        id: req.user.user_id,
        name: req.user.fullname,
        fullname: req.user.fullname,
        username: req.user.username,
        role_id: req.user.role_id,
        role_name: req.user.role_name,
        isForced: req.user.isForced,
        isLocked: req.user.isLocked,
        status: req.user.status,
      };
      const [menus, accessPaths] = await Promise.all([
        MenuService.getMenusByRole(req.user.role_id),
        MenuService.getAccessPathsByRole(req.user.role_id),
      ]);

      return res.json(success({ user, menus, accessPaths }));
    } catch (err) {
      return res.status(500).json(error(err.message));
    }
  },
};

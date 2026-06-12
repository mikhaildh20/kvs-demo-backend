import { DoubleCheckService } from "../services/doubleCheck.service.js";
import { error, success } from "../response/DtoResponse.js";

const statusOf = (err, fallback = 400) => err.statusCode || fallback;

export const DoubleCheckController = {
  async access(req, res) {
    try {
      const data = await DoubleCheckService.checkAccess(req.user.user_id);
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async scan(req, res) {
    try {
      const data = await DoubleCheckService.scan(req.body || {}, req.user);
      return res.json(success(data, "QR scanned successfully"));
    } catch (err) {
      return res.status(statusOf(err)).json(error(err.message));
    }
  },

  async submit(req, res) {
    try {
      const data = await DoubleCheckService.submit(req.body || {}, req.user);
      return res.json(success(data, "Double check saved"));
    } catch (err) {
      return res.status(statusOf(err)).json(error(err.message));
    }
  },

  async report(req, res) {
    try {
      const data = await DoubleCheckService.getReport(req.query || {});
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },

  async summary(req, res) {
    try {
      const data = await DoubleCheckService.getSummary(req.query || {}, req.user);
      return res.json(success(data));
    } catch (err) {
      return res.status(statusOf(err, 500)).json(error(err.message));
    }
  },
};

import { DoubleCheckModel } from "../models/doubleCheck.model.js";

const normalizeThreeDigitMark = (value) => String(value ?? "").trim();

const validateThreeDigitMark = (label, value, expectedValue) => {
  const normalized = normalizeThreeDigitMark(value);
  const expected = normalizeThreeDigitMark(expectedValue) || "000";

  if (!/^\d{3}$/.test(normalized)) {
    throw new Error(`${label} must be 3 digits`);
  }

  if (normalized !== expected) {
    throw new Error(`${label} must match kanban master (${expected})`);
  }

  return normalized;
};

const asNumber = (value) => {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
};

const assertAccess = async (userId) => {
  const line = await DoubleCheckModel.hasActiveLine(userId);
  if (!line) {
    const err = new Error("You are not registered for this process.");
    err.statusCode = 403;
    throw err;
  }

  return line;
};

const findMatch = async (qrText) => {
  const scanText = String(qrText || "").trim();
  if (!scanText) throw new Error("Scan QR is required");

  const rows = await DoubleCheckModel.findKanbanByBarcode(scanText);
  const row = rows?.[0];
  if (!row) return null;

  return {
    ...row,
    sequence: asNumber(row.next_sequence) || 1,
    qtyBox: 0,
    qrText: scanText,
    totalLabel: 1,
  };
};

export const DoubleCheckService = {
  async checkAccess(userId) {
    await DoubleCheckModel.ensureTable();
    const line = await DoubleCheckModel.hasActiveLine(userId);
    return {
      allowed: Boolean(line),
      lineId: line?.lin_id || null,
      lineCode: line?.mst_lines?.lin_code || "-",
    };
  },

  async getSummary(query, user) {
    await DoubleCheckModel.ensureTable();
    const line = await assertAccess(user.user_id);
    const rows = await DoubleCheckModel.getProductionSummary({
      lineId: query.LineId || query.lineId || line.lin_id,
      dateFrom: query.DateFrom || query.dateFrom,
      dateTo: query.DateTo || query.dateTo,
      kanbanNo: query.KanbanNo || query.kanbanNo,
    });
    const summary = rows?.[0] || {};

    return {
      lineId: line.lin_id,
      lineCode: line.mst_lines?.lin_code || "-",
      lineQty: asNumber(summary.LineQty),
      allLineQty: asNumber(summary.AllLineQty),
    };
  },

  async scan(payload, user) {
    await DoubleCheckModel.ensureTable();
    await assertAccess(user.user_id);

    const match = await findMatch(payload.qrText);
    if (!match) throw new Error("Kanban not found");

    if (!match.kbn_instruction_work_path || !match.kbn_sequence_check_path) {
      throw new Error("Kanban not found");
    }

    return {
      qrText: match.qrText,
      kanbanNo: match.kbn_no || "",
      sequence: Number(match.sequence),
      totalLabel: Number(match.totalLabel),
      checkedCount: 0,
      qtyBox: 0,
      qtyNg: 0,
      qtyOk: 0,
      deviceNo: match.kbn_device_no || "000",
      certMark: match.kbn_cert_mark || "000",
      instructionWorkPath: match.kbn_instruction_work_path || "",
      sequenceCheckPath: match.kbn_sequence_check_path || "",
      sequenceCheckVoicePath: match.kbn_sequence_check_voice_path || "",
      partNumber: "",
    };
  },

  async submit(payload, user) {
    await DoubleCheckModel.ensureTable();
    const line = await assertAccess(user.user_id);

    const qtyBox = Number(payload.qtyBox || 0);
    const qtyNg = Number(payload.qtyNg || 0);

    if (!payload.kanbanNo && !payload.kbnNo) throw new Error("Scan QR first");
    if (!Number.isFinite(qtyBox) || qtyBox <= 0) throw new Error("Qty must be greater than 0");
    if (!Number.isFinite(qtyNg) || qtyNg < 0) throw new Error("NG quantity is invalid");
    if (qtyNg > qtyBox) throw new Error("NG quantity cannot be greater than Qty");

    const match = await findMatch(payload.qrText);
    if (!match || String(match.kbn_no || "").trim() !== String(payload.kanbanNo || payload.kbnNo || "").trim()) {
      throw new Error("Kanban not found");
    }

    const sequence = Number(match.sequence);

    const kanbanRows = await DoubleCheckModel.findKanbanMarks(payload.kanbanNo || payload.kbnNo || "");
    const kanban = kanbanRows?.[0];
    if (!kanban) throw new Error("Kanban not found");

    validateThreeDigitMark("Device Number", payload.deviceNo, kanban.kbn_device_no);
    validateThreeDigitMark("Certificate Mark", payload.certMark, kanban.kbn_cert_mark);

    const qtyOk = qtyBox - qtyNg;
    await DoubleCheckModel.insertCheck(
      {
        kanbanNo: payload.kanbanNo || payload.kbnNo || "",
        lineId: line.lin_id,
        sequence,
        qrText: payload.qrText || "",
        qtyBox,
        qtyNg,
        qtyOk,
      },
      user.fullname
    );

    return {
      completed: true,
      checkedCount: 1,
      totalLabel: 1,
      qtyOk,
    };
  },

  async getReport(query) {
    await DoubleCheckModel.ensureTable();

    const [rows, totalRows] = await DoubleCheckModel.findReportRows({
      dateFrom: query.DateFrom || query.dateFrom,
      dateTo: query.DateTo || query.dateTo,
      lineId: query.LineId || query.lineId,
      kanbanNo: query.KanbanNo || query.kanbanNo,
      pageNumber: query.PageNumber || query.pageNumber,
      pageSize: query.PageSize || query.pageSize,
    });
    const totals = totalRows?.[0] || {};

    const data = rows.map((row) => {
      const qtyTotal = Number(row.doc_qty_total || 0);
      const qtyNg = Number(row.doc_qty_ng || 0);
      const qtyOk = Math.max(qtyTotal - qtyNg, 0);

      return {
        Id: row.doc_id,
        Date: row.doc_creadate,
        LineId: row.lin_id,
        LineCode: row.lin_code || "-",
        KanbanNo: row.kbn_no || "-",
        QtyTotal: qtyTotal,
        QtyNG: qtyNg,
        QtyOK: qtyOk,
        Inspector: row.doc_creaby || "-",
        DeviceNo: row.kbn_device_no || "000",
        CertMark: row.kbn_cert_mark || "000",
      };
    });

    const totalOK = asNumber(totals.TotalOK);
    const totalNG = asNumber(totals.TotalNG);
    const summaryRows = await DoubleCheckModel.getProductionSummary({
      lineId: query.LineId || query.lineId,
      dateFrom: query.DateFrom || query.dateFrom,
      dateTo: query.DateTo || query.dateTo,
      kanbanNo: query.KanbanNo || query.kanbanNo,
    });
    const productionSummary = summaryRows?.[0] || {};

    return {
      data,
      totalData: asNumber(totals.TotalData),
      summary: {
        totalQty: asNumber(productionSummary.LineQty),
        allLineQty: asNumber(productionSummary.AllLineQty),
        totalOK,
        totalNG,
        ngRatio: totalOK > 0 ? (totalNG / totalOK) * 100 : 0,
      },
    };
  },
};

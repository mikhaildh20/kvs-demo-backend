import { excelSerialDateToDate, readFirstWorksheetAsObjects } from "../utils/excelReader.js";
import { BarcodeDeliveryScanModel } from "../models/barcodeDeliveryScan.model.js";
import { ActionLogModel } from "../models/actionLog.model.js";
import { OQCService } from "./oqc.service.js";

const normalizeColumn = (value) => String(value || "").trim().toUpperCase();

const normalizeKanbanNo = (value) => {
  const raw = String(value || "").trim();
  const normalized = raw.includes(".") ? raw.split(".")[0] : raw;
  return normalized.padStart(4, "0").slice(0, 5);
};

const normalizeBarcodeText = (value) => String(value || "").trim().toUpperCase();
const normalizeQrText = (value) => String(value || "").trim();

const extractKanbanFromPik = (value) => {
  const barcode = normalizeBarcodeText(value);
  return barcode.length >= 5 ? barcode.slice(1, 5) : "";
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const parseExcelDate = (value) => {
  if (!value) return null;
  if (typeof value === "number") {
    const parsed = excelSerialDateToDate(value);
    if (parsed) return parsed;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toSqlDate = (value) => {
  if (!value) return null;

  if (typeof value === "number") {
    const date = excelSerialDateToDate(value);
    if (!date) return null;

    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  const date = parseExcelDate(value);
  if (!date) return null;

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const getCell = (row, column) => {
  const key = Object.keys(row || {}).find((item) => normalizeColumn(item) === normalizeColumn(column));
  return key ? row[key] : "";
};

const requiredColumns = [
  "Ship Date",
  "Ship No",
  "S/O No",
  "P/O No",
  "Draw No",
  "CUS Cd",
  "Qty Per Box",
  "Box Qty",
];

const assertRequiredColumns = (rows) => {
  const firstRow = rows?.[0] || {};
  const headers = new Set(Object.keys(firstRow).map(normalizeColumn));
  const missing = requiredColumns.filter((column) => !headers.has(normalizeColumn(column)));

  if (missing.length > 0) {
    throw new Error(`Missing columns: ${missing.join(", ")}`);
  }
};

const mapKanbanOption = (row) => {
  const boxQty = Number(row.bds_box_qty || 0);
  const shipDate = dateKey(row.bds_ship_date);
  const id = [
    shipDate,
    row.bds_ship_no || "",
    row.bds_so_no || "",
    row.bds_po_no || "",
    row.kbn_no || "",
  ].map((item) => encodeURIComponent(String(item))).join("|");

  return {
    Id: id,
    ShipDate: shipDate,
    ShipNo: row.bds_ship_no || "",
    SoNo: row.bds_so_no || "",
    PoNo: row.bds_po_no || "-",
    KanbanNo: row.kbn_no || "-",
    CustomerCode: row.cst_code || "-",
    CustomerName: row.cst_name || "-",
    PartNumber: row.pnu_code || "-",
    PartDescription: row.pnu_part_desc || "-",
    BoxQty: boxQty,
    ScannedQty: Number(row.scanned_box || 0),
    RemainingQty: Math.max(Number(row.remaining_box ?? boxQty), 0),
    Status: Number(row.bds_status || 0),
    LogisticGuidePath: row.kbn_logistic_guide_path || "",
    LogisticGuideVoicePath: row.kbn_logistic_guide_voice_path || "",
  };
};

const asNumber = (value) => {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
};

const mapListRow = (row) => ({
  Id: [
    dateKey(row.bds_ship_date),
    row.bds_ship_no || "",
    row.bds_so_no || "",
    row.bds_po_no || "",
    row.kbn_no || "",
  ].map((item) => encodeURIComponent(String(item))).join("|"),
  ShipDate: dateKey(row.bds_ship_date),
  ShipNo: row.bds_ship_no || "-",
  SoNo: row.bds_so_no || "-",
  PoNo: row.bds_po_no || "-",
  KanbanNo: row.kbn_no || "-",
  CustomerCode: row.cst_code || "-",
  CustomerName: row.cst_name || "-",
  QtyPerBox: Number(row.bds_qty_perbox || 0),
  BoxQty: Number(row.bds_box_qty || 0),
  ScannedQty: Number(row.scanned_box || 0),
  RemainingQty: Math.max(Number(row.remaining_box ?? row.bds_box_qty ?? 0), 0),
  Status: Number(row.bds_status || 0),
  CreatedAt: row.bds_creadate,
  CreatedBy: row.bds_creaby || "-",
});

const mapPoReportRow = (row) => ({
  Id: [dateKey(row.bds_ship_date), row.bds_po_no || ""].map((item) => encodeURIComponent(String(item))).join("|"),
  ShipDate: dateKey(row.bds_ship_date),
  PoNo: row.bds_po_no || "-",
  CustomerName: row.cst_name || "-",
  TotalKanban: Number(row.TotalKanban || 0),
  TotalBox: Number(row.TotalBox || 0),
  ScannedBox: Number(row.ScannedBox || 0),
  RemainingBox: Number(row.RemainingBox || 0),
  Status: Number(row.Status || 0),
});

const parsePoReportId = (id) => {
  const [shipDate, poNo] = String(id || "").split("|").map((item) => decodeURIComponent(item || ""));
  if (!shipDate || !poNo) throw new Error("PO report detail is invalid");
  return { shipDate, poNo };
};

const parseTargetId = (id) => {
  const [shipDate, shipNo, soNo, poNo, kanbanNo] = String(id || "")
    .split("|")
    .map((item) => decodeURIComponent(item || ""));

  if (!shipDate || !shipNo || !soNo || !poNo || !kanbanNo) {
    throw new Error("Kanban delivery target is invalid");
  }

  return { shipDate, shipNo, soNo, poNo, kanbanNo };
};

const createLockLog = async ({ target, barcode, user }) => {
  try {
    const menu = await ActionLogModel.findMenuByPath("/pages/barcode-delivery-scan");
    if (!menu) return;

    await ActionLogModel.create(
      {
        menuId: menu.mnu_id,
        action: "LOCK",
        oldValue: `User: ${user.fullname || user.username || user.user_id}, Kanban: ${target.kbn_no || "-"}`,
        newValue: `Wrong OQC Barcode: ${barcode || "-"}, Expected: ${target.kbn_oqc_barcode || "-"}`,
      },
      user.fullname
    );
  } catch {
    // Lock must still happen even if logging fails.
  }
};

const assertGeneratedOqcQrMatch = async ({ target, barcode, user }) => {
  const actual = normalizeQrText(barcode);

  if (!actual) {
    throw new Error("OQC QR is required");
  }

  const oqcRows = await BarcodeDeliveryScanModel.findOqcIdsByKanban(target.kbn_no);

  for (const oqcRow of oqcRows || []) {
    const preview = await OQCService.previewByOqcId(oqcRow.oqc_id, user.fullname);
    const matched = (preview.labels || []).some(
      (label) => normalizeQrText(label.qrText) === actual
    );

    if (matched) return;
  }

  await createLockLog({
    target: {
      kbn_no: target.kbn_no || "-",
      kbn_oqc_barcode: "Generated OQC QR label",
    },
    barcode,
    user,
  });
  await BarcodeDeliveryScanModel.lockUser(user.user_id);
  const err = new Error("Wrong OQC QR. Your account has been locked.");
  err.statusCode = 400;
  throw err;
};

const assertRequiredBarcode = (barcode, label) => {
  if (!normalizeBarcodeText(barcode)) {
    throw new Error(`${label} is required`);
  }
};

const lockWrongKanban = async ({ kanbanNo, poNo, barcode, user }) => {
  await createLockLog({
    target: { kbn_no: kanbanNo || "-", kbn_oqc_barcode: `PO ${poNo || "-"}` },
    barcode,
    user,
  });
  await BarcodeDeliveryScanModel.lockUser(user.user_id);
  const err = new Error("Wrong Kanban. Your account has been locked.");
  err.statusCode = 400;
  throw err;
};

export const BarcodeDeliveryScanService = {
  async importExcel(file, user) {
    await BarcodeDeliveryScanModel.ensureTable();
    if (!file) throw new Error("Excel file is required");

    const rows = await readFirstWorksheetAsObjects(file.path, { defval: "" });
    assertRequiredColumns(rows);

    let imported = 0;
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of rows) {
      const shipDate = toSqlDate(getCell(row, "Ship Date"));
      const poNo = String(getCell(row, "P/O No") || "").trim();
      const kanbanNo = normalizeKanbanNo(getCell(row, "Draw No"));

      if (!shipDate || !poNo || !kanbanNo) continue;

      const result = await BarcodeDeliveryScanModel.insertImportRow(
        {
          shipDate,
          shipNo: String(getCell(row, "Ship No") || "").trim(),
          soNo: String(getCell(row, "S/O No") || "").trim(),
          poNo,
          kanbanNo,
          customerCode: normalizeBarcodeText(getCell(row, "CUS Cd")),
          qtyPerBox: parseNumber(getCell(row, "Qty Per Box")),
          boxQty: parseNumber(getCell(row, "Box Qty")),
        },
        "PRONES"
      );

      if (result === "created") inserted += 1;
      if (result === "updated") updated += 1;
      if (result === "unchanged") unchanged += 1;
      imported += 1;
    }

    return {
      imported,
      inserted,
      updated,
      unchanged,
      changed: inserted + updated,
      noChanges: imported > 0 && inserted + updated === 0,
    };
  },

  async getAll(query) {
    await BarcodeDeliveryScanModel.ensureTable();
    const [rows, totalRows, summaryRows] = await BarcodeDeliveryScanModel.findPaged(query);
    const summary = summaryRows?.[0] || {};

    return {
      data: rows.map(mapListRow),
      totalData: asNumber(totalRows?.[0]?.TotalData),
      summary: {
        totalData: asNumber(summary.TotalData),
        totalRemaining: asNumber(summary.TotalRemaining),
        totalDone: asNumber(summary.TotalDone),
        totalOpen: asNumber(summary.TotalOpen),
      },
    };
  },

  async getPoReport(query) {
    await BarcodeDeliveryScanModel.ensureTable();
    const [rows, totalRows, summaryRows] = await BarcodeDeliveryScanModel.findPoReportRows({
      dateFrom: query.DateFrom || query.dateFrom,
      dateTo: query.DateTo || query.dateTo,
      poNo: query.PoNo || query.poNo,
      status: query.Status ?? query.status,
      pageNumber: query.PageNumber || query.pageNumber,
      pageSize: query.PageSize || query.pageSize,
    });
    const summary = summaryRows?.[0] || {};

    return {
      data: rows.map(mapPoReportRow),
      totalData: asNumber(totalRows?.[0]?.TotalData),
      summary: {
        totalPo: asNumber(summary.TotalPo),
        totalBox: asNumber(summary.TotalBox),
        scannedBox: asNumber(summary.ScannedBox),
        remainingBox: asNumber(summary.RemainingBox),
        donePo: asNumber(summary.DonePo),
        openPo: asNumber(summary.OpenPo),
      },
    };
  },

  async getPoReportDetail(rawId) {
    await BarcodeDeliveryScanModel.ensureTable();
    const key = parsePoReportId(rawId);
    const rows = await BarcodeDeliveryScanModel.findPoDetailRows(key);

    return {
      shipDate: key.shipDate,
      poNo: key.poNo,
      data: rows.map((row) => ({
        Id: [
          dateKey(row.bds_ship_date),
          row.bds_ship_no || "",
          row.bds_so_no || "",
          row.bds_po_no || "",
          row.kbn_no || "",
        ].map((item) => encodeURIComponent(String(item))).join("|"),
        ShipDate: dateKey(row.bds_ship_date),
        ShipNo: row.bds_ship_no || "-",
        SoNo: row.bds_so_no || "-",
        PoNo: row.bds_po_no || "-",
        KanbanNo: row.kbn_no || "-",
        PartNumber: row.pnu_code || "-",
        PartDescription: row.pnu_part_desc || "-",
        CustomerCode: row.cst_code || "-",
        CustomerName: row.cst_name || "-",
        QtyPerBox: Number(row.bds_qty_perbox || 0),
        TotalBox: Number(row.bds_box_qty || 0),
        ScannedBox: Number(row.scanned_box || 0),
        RemainingBox: Number(row.remaining_box || 0),
        Status: Number(row.status || 0),
      })),
    };
  },

  async getPoOptions(query) {
    await BarcodeDeliveryScanModel.ensureTable();
    const rows = await BarcodeDeliveryScanModel.findPoOptions({ shipDate: query.ShipDate || query.shipDate });

    return rows.map((row) => ({
      PoNo: row.bds_po_no || "-",
      CustomerName: row.cst_name || "-",
      TotalKanban: Number(row.total_box || 0),
      ScannedKanban: Number(row.scanned_box || 0),
    }));
  },

  async getKanbanOptions(query) {
    await BarcodeDeliveryScanModel.ensureTable();
    const rows = await BarcodeDeliveryScanModel.findKanbanOptions({
      shipDate: query.ShipDate || query.shipDate,
      poNo: query.PoNo || query.poNo,
    });

    return rows.map(mapKanbanOption);
  },

  async getScanTarget(id) {
    await BarcodeDeliveryScanModel.ensureTable();
    const rows = await BarcodeDeliveryScanModel.findScanTarget(parseTargetId(id));
    const row = rows?.[0];
    if (!row) throw new Error("Kanban delivery target not found");

    return mapKanbanOption(row);
  },

  async resolvePik(payload, user) {
    await BarcodeDeliveryScanModel.ensureTable();

    const shipDate = payload.ShipDate || payload.shipDate;
    const poNo = payload.PoNo || payload.poNo;
    const pikBarcode = payload.PikBarcode || payload.pikBarcode;
    const kanbanNo = extractKanbanFromPik(pikBarcode);

    if (!shipDate) throw new Error("Ship Date is required");
    if (!poNo) throw new Error("PO No is required");
    assertRequiredBarcode(pikBarcode, "PIK Barcode");

    if (!kanbanNo) {
      await lockWrongKanban({ kanbanNo: "-", poNo, barcode: pikBarcode, user });
    }

    const rows = await BarcodeDeliveryScanModel.findScanTargetByPoKanban({ shipDate, poNo, kanbanNo });
    const target = rows?.[0];

    if (!target) {
      await lockWrongKanban({ kanbanNo, poNo, barcode: pikBarcode, user });
    }

    if (Number(target.remaining_box || 0) <= 0) {
      throw new Error("This kanban has no remaining box to scan");
    }

    return mapKanbanOption(target);
  },

  async submitScan(payload, user) {
    await BarcodeDeliveryScanModel.ensureTable();
    const key = parseTargetId(payload.Id || payload.id);
    const rows = await BarcodeDeliveryScanModel.findScanTarget(key);
    const target = rows?.[0];
    if (!target) throw new Error("Kanban delivery target not found");
    if (Number(target.remaining_box || 0) <= 0) throw new Error("This kanban has no remaining box to scan");

    const pikBarcode = payload.PikBarcode || payload.pikBarcode;
    const customerBarcode = payload.CustomerBarcode || payload.customerBarcode;
    const oqcBarcode = payload.OqcBarcode || payload.oqcBarcode;
    const pikKanbanNo = extractKanbanFromPik(pikBarcode);

    assertRequiredBarcode(pikBarcode, "PIK Barcode");
    assertRequiredBarcode(customerBarcode, "Customer Barcode");
    if (pikKanbanNo !== key.kanbanNo) {
      await lockWrongKanban({ kanbanNo: pikKanbanNo, poNo: key.poNo, barcode: pikBarcode, user });
    }
    await assertGeneratedOqcQrMatch({ target, barcode: oqcBarcode, user });

    await BarcodeDeliveryScanModel.insertScanDetail(
      key,
      {
        pikBarcode,
        customerBarcode,
        oqcBarcode,
      },
      user.fullname
    );
    await BarcodeDeliveryScanModel.updateHeaderStatus(key);
    const updatedRows = await BarcodeDeliveryScanModel.findScanTarget(key);
    const updated = mapKanbanOption(updatedRows?.[0] || target);

    return updated;
  },
};

import prisma from "./prisma.js";

let tableReady = false;

const safeDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "");
const toDate = (value) => {
  const dateValue = safeDate(value);
  if (!dateValue) return null;
  return new Date(`${dateValue}T00:00:00.000Z`);
};
const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
};
const toNumber = (value) => Number(value || 0);
const scannedCount = (row) => row.txn_barcode_delivery_scan_detail?.length || 0;
const latestPart = (row) => row.mst_kanbans?.detail_kanban_part_number?.[0] || {};

const includeDeliveryRelations = {
  mst_customers: { select: { cst_name: true } },
  mst_kanbans: {
    select: {
      kbn_logistic_guide_path: true,
      kbn_logistic_guide_voice_path: true,
      kbn_oqc_barcode: true,
      detail_kanban_part_number: {
        where: { pnu_status: 1 },
        select: { pnu_code: true, pnu_part_desc: true, pnu_latest_date: true },
        orderBy: { pnu_latest_date: "desc" },
        take: 1,
      },
    },
  },
  txn_barcode_delivery_scan_detail: { select: { bdsd_id: true } },
};

const flattenDeliveryRow = (row) => {
  const scanned = scannedCount(row);
  const boxQty = toNumber(row.bds_box_qty);
  const latest = latestPart(row);

  return {
    ...row,
    cst_name: row.mst_customers?.cst_name,
    scanned_box: scanned,
    remaining_box: Math.max(boxQty - scanned, 0),
    pnu_code: latest.pnu_code,
    pnu_part_desc: latest.pnu_part_desc,
    kbn_logistic_guide_path: row.mst_kanbans?.kbn_logistic_guide_path,
    kbn_logistic_guide_voice_path: row.mst_kanbans?.kbn_logistic_guide_voice_path,
    kbn_oqc_barcode: row.mst_kanbans?.kbn_oqc_barcode,
  };
};

const buildDeliveryWhere = (query = {}) => {
  const where = {};
  const and = [];

  if (query.Keyword) {
    const keyword = String(query.Keyword);
    and.push({
      OR: [
        { bds_ship_no: { contains: keyword } },
        { bds_so_no: { contains: keyword } },
        { bds_po_no: { contains: keyword } },
        { kbn_no: { contains: keyword } },
        { cst_code: { contains: keyword } },
        { mst_customers: { is: { cst_name: { contains: keyword } } } },
      ],
    });
  }

  if (safeDate(query.ShipDate)) where.bds_ship_date = toDate(query.ShipDate);
  if (safeDate(query.DateFrom) || safeDate(query.DateTo)) {
    where.bds_ship_date = {};
    if (safeDate(query.DateFrom)) where.bds_ship_date.gte = toDate(query.DateFrom);
    if (safeDate(query.DateTo)) where.bds_ship_date.lte = toDate(query.DateTo);
  }
  if (query.PoNo) where.bds_po_no = String(query.PoNo);
  if (query.KanbanNo) where.kbn_no = String(query.KanbanNo);
  if (query.Status !== undefined && query.Status !== null && query.Status !== "") where.bds_status = Number(query.Status);
  if (and.length) where.AND = and;

  return where;
};

const resolveOrderBy = (sortValue = "bds_ship_date DESC") => {
  const [rawColumn, rawDirection] = String(sortValue).split(/\s+/);
  const columnMap = {
    bds_ship_date: "bds_ship_date",
    bds_po_no: "bds_po_no",
    kbn_no: "kbn_no",
    bds_status: "bds_status",
  };
  const column = columnMap[rawColumn] || "bds_ship_date";
  const direction = String(rawDirection || "DESC").toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [column]: direction }, { bds_po_no: "asc" }, { kbn_no: "asc" }];
};

const deliveryKeyWhere = (key) => ({
  bds_ship_date: toDate(key.shipDate),
  bds_ship_no: String(key.shipNo || ""),
  bds_so_no: String(key.soNo || ""),
  bds_po_no: String(key.poNo || ""),
  kbn_no: String(key.kanbanNo || ""),
});

const sumDeliveryRows = (rows) =>
  rows.reduce(
    (summary, row) => {
      const scanned = scannedCount(row);
      const remaining = Math.max(toNumber(row.bds_box_qty) - scanned, 0);
      summary.TotalData += 1;
      summary.TotalRemaining += remaining;
      summary.TotalDone += toNumber(row.bds_status) === 1 ? 1 : 0;
      summary.TotalOpen += toNumber(row.bds_status) === 0 ? 1 : 0;
      return summary;
    },
    { TotalData: 0, TotalRemaining: 0, TotalDone: 0, TotalOpen: 0 }
  );

const poReportRows = (rows) => {
  const groups = new Map();

  for (const row of rows) {
    const key = `${dateKey(row.bds_ship_date)}|${row.bds_po_no}`;
    const scanned = scannedCount(row);
    const remaining = Math.max(toNumber(row.bds_box_qty) - scanned, 0);
    const current = groups.get(key) || {
      bds_ship_date: row.bds_ship_date,
      bds_po_no: row.bds_po_no,
      cst_name: row.mst_customers?.cst_name,
      TotalKanban: 0,
      TotalBox: 0,
      ScannedBox: 0,
      RemainingBox: 0,
      Status: 0,
    };

    current.TotalKanban += 1;
    current.TotalBox += toNumber(row.bds_box_qty);
    current.ScannedBox += scanned;
    current.RemainingBox += remaining;
    current.Status = current.RemainingBox === 0 ? 1 : 0;
    if (!current.cst_name) current.cst_name = row.mst_customers?.cst_name;
    groups.set(key, current);
  }

  return Array.from(groups.values()).map((row) => ({ ...row, Status: row.RemainingBox === 0 ? 1 : 0 }));
};

export const BarcodeDeliveryScanModel = {
  async ensureTable() {
    tableReady = true;
  },

  async insertImportRow(row, userFullname) {
    const key = deliveryKeyWhere(row);
    const data = {
      bds_ship_date: toDate(row.shipDate),
      bds_ship_no: row.shipNo,
      bds_so_no: row.soNo,
      bds_po_no: row.poNo,
      kbn_no: row.kanbanNo,
      cst_code: row.customerCode,
      bds_qty_perbox: Number(row.qtyPerBox || 0),
      bds_box_qty: Number(row.boxQty || 0),
    };

    const existing = await prisma.txn_barcode_delivery_scan.findFirst({
      where: key,
      select: {
        cst_code: true,
        bds_qty_perbox: true,
        bds_box_qty: true,
      },
    });

    if (existing) {
      const changed =
        String(existing.cst_code || "") !== String(data.cst_code || "") ||
        Number(existing.bds_qty_perbox || 0) !== Number(data.bds_qty_perbox || 0) ||
        Number(existing.bds_box_qty || 0) !== Number(data.bds_box_qty || 0);

      if (!changed) {
        return "unchanged";
      }

      await prisma.txn_barcode_delivery_scan.updateMany({
        where: key,
        data,
      });
      return "updated";
    }

    await prisma.txn_barcode_delivery_scan.create({
      data: {
        ...data,
        bds_status: 0,
        bds_creaby: userFullname,
      },
    });
    return "created";
  },

  async findPaged(query = {}) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildDeliveryWhere(query);

    const [rows, totalData, allRows] = await Promise.all([
      prisma.txn_barcode_delivery_scan.findMany({
        where,
        include: includeDeliveryRelations,
        orderBy: resolveOrderBy(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.txn_barcode_delivery_scan.count({ where }),
      prisma.txn_barcode_delivery_scan.findMany({
        where,
        include: { txn_barcode_delivery_scan_detail: { select: { bdsd_id: true } } },
      }),
    ]);

    return [rows.map(flattenDeliveryRow), [{ TotalData: totalData }], [sumDeliveryRows(allRows)]];
  },

  async findPoOptions({ shipDate }) {
    const where = safeDate(shipDate) ? { bds_ship_date: toDate(shipDate) } : {};
    const rows = await prisma.txn_barcode_delivery_scan.findMany({
      where,
      include: {
        mst_customers: { select: { cst_name: true } },
        txn_barcode_delivery_scan_detail: { select: { bdsd_id: true } },
      },
      orderBy: { bds_po_no: "asc" },
    });

    const grouped = new Map();
    for (const row of rows) {
      const current = grouped.get(row.bds_po_no) || {
        bds_po_no: row.bds_po_no,
        cst_name: row.mst_customers?.cst_name,
        total_box: 0,
        scanned_box: 0,
      };
      current.total_box += toNumber(row.bds_box_qty);
      current.scanned_box += scannedCount(row);
      if (!current.cst_name) current.cst_name = row.mst_customers?.cst_name;
      grouped.set(row.bds_po_no, current);
    }

    return Array.from(grouped.values()).sort((a, b) => String(a.bds_po_no).localeCompare(String(b.bds_po_no)));
  },

  async findKanbanOptions({ shipDate, poNo }) {
    const where = {};
    if (safeDate(shipDate)) where.bds_ship_date = toDate(shipDate);
    if (poNo) where.bds_po_no = String(poNo);

    const rows = await prisma.txn_barcode_delivery_scan.findMany({
      where,
      include: includeDeliveryRelations,
      orderBy: { kbn_no: "asc" },
    });

    return rows.map(flattenDeliveryRow);
  },

  async findScanTarget(key) {
    const row = await prisma.txn_barcode_delivery_scan.findFirst({
      where: deliveryKeyWhere(key),
      include: includeDeliveryRelations,
    });

    return row ? [flattenDeliveryRow(row)] : [];
  },

  async findScanTargetByPoKanban({ shipDate, poNo, kanbanNo }) {
    const rows = await prisma.txn_barcode_delivery_scan.findMany({
      where: {
        ...(safeDate(shipDate) ? { bds_ship_date: toDate(shipDate) } : {}),
        bds_po_no: String(poNo || ""),
        kbn_no: String(kanbanNo || ""),
      },
      include: includeDeliveryRelations,
      orderBy: [{ bds_ship_no: "asc" }, { bds_so_no: "asc" }],
    });

    return rows.map(flattenDeliveryRow);
  },

  insertScanDetail: (key, data, userFullname) =>
    prisma.txn_barcode_delivery_scan_detail.create({
      data: {
        bds_ship_date: toDate(key.shipDate),
        bds_ship_no: key.shipNo,
        bds_so_no: key.soNo,
        bds_po_no: key.poNo,
        kbn_no: key.kanbanNo,
        bds_barcode_pik: data.pikBarcode,
        bds_barcode_cst: data.customerBarcode,
        bds_barcode_oqc: data.oqcBarcode,
        bds_veriby: userFullname,
      },
    }),

  async updateHeaderStatus(key) {
    const where = deliveryKeyWhere(key);
    const [header, scanned] = await Promise.all([
      prisma.txn_barcode_delivery_scan.findFirst({ where, select: { bds_box_qty: true } }),
      prisma.txn_barcode_delivery_scan_detail.count({ where }),
    ]);

    return prisma.txn_barcode_delivery_scan.updateMany({
      where,
      data: {
        bds_status: scanned >= toNumber(header?.bds_box_qty) ? 1 : 0,
      },
    });
  },

  findOqcIdsByKanban: (kanbanNo) =>
    prisma.txn_ongoing_quality_check.findMany({
      where: { kbn_no: String(kanbanNo || "") },
      select: { oqc_id: true },
      orderBy: [{ oqc_creadate: "desc" }, { oqc_id: "desc" }],
    }),

  async findPoReportRows({ dateFrom, dateTo, poNo, status, pageNumber, pageSize }) {
    const page = Math.max(Number(pageNumber || 1), 1);
    const size = Math.max(Number(pageSize || 10), 1);
    const where = buildDeliveryWhere({ DateFrom: dateFrom, DateTo: dateTo, PoNo: poNo });
    const allRows = await prisma.txn_barcode_delivery_scan.findMany({
      where,
      include: {
        mst_customers: { select: { cst_name: true } },
        txn_barcode_delivery_scan_detail: { select: { bdsd_id: true } },
      },
    });

    const statusValue = status === undefined || status === null || status === "" ? null : Number(status);
    const grouped = poReportRows(allRows)
      .filter((row) => statusValue === null || Number(row.Status) === statusValue)
      .sort((a, b) => {
        const byDate = new Date(b.bds_ship_date) - new Date(a.bds_ship_date);
        return byDate || String(a.bds_po_no).localeCompare(String(b.bds_po_no));
      });
    const paged = grouped.slice((page - 1) * size, page * size);
    const summary = grouped.reduce(
      (acc, row) => {
        acc.TotalPo += 1;
        acc.TotalBox += toNumber(row.TotalBox);
        acc.ScannedBox += toNumber(row.ScannedBox);
        acc.RemainingBox += toNumber(row.RemainingBox);
        acc.DonePo += Number(row.Status) === 1 ? 1 : 0;
        acc.OpenPo += Number(row.Status) === 0 ? 1 : 0;
        return acc;
      },
      { TotalPo: 0, TotalBox: 0, ScannedBox: 0, RemainingBox: 0, DonePo: 0, OpenPo: 0 }
    );

    return [paged, [{ TotalData: grouped.length }], [summary]];
  },

  async findPoDetailRows({ shipDate, poNo }) {
    const rows = await prisma.txn_barcode_delivery_scan.findMany({
      where: {
        ...(safeDate(shipDate) ? { bds_ship_date: toDate(shipDate) } : {}),
        bds_po_no: String(poNo || ""),
      },
      include: includeDeliveryRelations,
      orderBy: { kbn_no: "asc" },
    });

    return rows.map((row) => {
      const flat = flattenDeliveryRow(row);
      return {
        ...flat,
        status: flat.remaining_box <= 0 ? 1 : 0,
      };
    });
  },

  lockUser: (userId) =>
    prisma.mst_users.update({
      where: { usr_id: Number(userId) },
      data: { usr_isLocked: 1 },
    }),
};

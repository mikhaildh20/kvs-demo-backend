import prisma from "./prisma.js";

let tableReady = false;

const safeDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "");
const toNumber = (value) => Number(value || 0);

const dateAtHour = (dateValue, hour = 8, addDays = 0) => {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  if (!dateValue && date.getHours() < hour) date.setDate(date.getDate() - 1);
  date.setDate(date.getDate() + addDays);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const productionWindow = (dateFrom, dateTo) => {
  const startDate = safeDate(dateFrom);
  const endDate = safeDate(dateTo || dateFrom);
  const start = dateAtHour(startDate, 8, 0);
  const end = endDate ? dateAtHour(endDate, 8, 1) : dateAtHour(startDate, 8, 1);
  return { start, end };
};

const buildReportWhere = ({ dateFrom, dateTo, lineId, kanbanNo } = {}) => {
  const where = {};
  const startDate = safeDate(dateFrom);
  const endDate = safeDate(dateTo);

  if (startDate || endDate) {
    where.doc_creadate = {};
    if (startDate) where.doc_creadate.gte = dateAtHour(startDate, 8, 0);
    if (endDate) where.doc_creadate.lt = dateAtHour(endDate, 8, 1);
  }

  if (lineId) where.lin_id = Number(lineId);
  if (kanbanNo) where.kbn_no = String(kanbanNo);

  return where;
};

export const DoubleCheckModel = {
  async ensureTable() {
    tableReady = true;
  },

  hasActiveLine: (userId) =>
    prisma.detail_line.findFirst({
      where: {
        usr_id: Number(userId),
        dle_status: 1,
      },
      select: {
        lin_id: true,
        mst_lines: {
          select: {
            lin_code: true,
          },
        },
      },
    }),

  async getProductionSummary({ lineId, dateFrom, dateTo, kanbanNo } = {}) {
    const { start, end } = productionWindow(dateFrom, dateTo);
    const rows = await prisma.txn_double_check.findMany({
      where: {
        doc_creadate: {
          gte: start,
          lt: end,
        },
        ...(kanbanNo ? { kbn_no: String(kanbanNo) } : {}),
      },
      select: {
        lin_id: true,
        doc_qty_total: true,
      },
    });

    return [
      {
        LineQty: rows
          .filter((row) => !lineId || Number(row.lin_id) === Number(lineId))
          .reduce((sum, row) => sum + toNumber(row.doc_qty_total), 0),
        AllLineQty: rows.reduce((sum, row) => sum + toNumber(row.doc_qty_total), 0),
      },
    ];
  },

  async findKanbanByBarcode(qrText) {
    const kanban = await prisma.mst_kanbans.findFirst({
      where: {
        kbn_oqc_barcode: String(qrText || ""),
        kbn_status: 1,
      },
      select: {
        kbn_no: true,
        kbn_device_no: true,
        kbn_cert_mark: true,
        kbn_instruction_work_path: true,
        kbn_sequence_check_path: true,
        kbn_sequence_check_voice_path: true,
        txn_double_check: {
          select: { doc_sequence: true },
          orderBy: { doc_sequence: "desc" },
          take: 1,
        },
      },
    });

    if (!kanban) return [];
    const latestSequence = Number(kanban.txn_double_check?.[0]?.doc_sequence || 0);
    const { txn_double_check, ...row } = kanban;
    return [{ ...row, next_sequence: latestSequence + 1 }];
  },

  findKanbanMarks: async (kanbanNo) => {
    const kanban = await prisma.mst_kanbans.findUnique({
      where: { kbn_no: String(kanbanNo || "") },
      select: {
        kbn_device_no: true,
        kbn_cert_mark: true,
      },
    });

    return kanban ? [kanban] : [];
  },

  insertCheck: (data, userFullname) =>
    prisma.txn_double_check.create({
      data: {
        kbn_no: data.kanbanNo,
        lin_id: Number(data.lineId),
        doc_qr_scan: data.qrText,
        doc_sequence: Number(data.sequence),
        doc_qty_total: Number(data.qtyBox),
        doc_qty_ng: Number(data.qtyNg),
        doc_creaby: userFullname,
      },
    }),

  async findReportRows({ dateFrom, dateTo, lineId, kanbanNo, pageNumber, pageSize }) {
    const page = Math.max(Number(pageNumber || 1), 1);
    const size = Math.max(Number(pageSize || 10), 1);
    const where = buildReportWhere({ dateFrom, dateTo, lineId, kanbanNo });

    const [rows, allRows] = await Promise.all([
      prisma.txn_double_check.findMany({
        where,
        select: {
          doc_id: true,
          kbn_no: true,
          lin_id: true,
          doc_qty_total: true,
          doc_qty_ng: true,
          doc_creadate: true,
          doc_creaby: true,
          mst_kanbans: {
            select: {
              kbn_device_no: true,
              kbn_cert_mark: true,
            },
          },
          mst_lines: {
            select: {
              lin_code: true,
            },
          },
        },
        orderBy: [{ doc_creadate: "desc" }, { doc_id: "desc" }],
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.txn_double_check.findMany({
        where,
        select: {
          doc_qty_total: true,
          doc_qty_ng: true,
        },
      }),
    ]);

    const data = rows.map((row) => ({
      doc_id: row.doc_id,
      kbn_no: row.kbn_no,
      lin_id: row.lin_id,
      doc_qty_total: row.doc_qty_total,
      doc_qty_ng: row.doc_qty_ng,
      doc_creadate: row.doc_creadate,
      doc_creaby: row.doc_creaby,
      kbn_device_no: row.mst_kanbans?.kbn_device_no,
      kbn_cert_mark: row.mst_kanbans?.kbn_cert_mark,
      lin_code: row.mst_lines?.lin_code,
    }));

    const totals = allRows.reduce(
      (summary, row) => {
        const qtyTotal = toNumber(row.doc_qty_total);
        const qtyNg = toNumber(row.doc_qty_ng);
        summary.TotalOK += Math.max(qtyTotal - qtyNg, 0);
        summary.TotalNG += qtyNg;
        return summary;
      },
      { TotalData: allRows.length, TotalOK: 0, TotalNG: 0 }
    );

    return [data, [totals]];
  },
};

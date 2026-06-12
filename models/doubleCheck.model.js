import prisma from "./prisma.js";

let tableReady = false;

const collate = "Latin1_General_CI_AS";

const safeDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "");

const productionStartSql = (dateValue) =>
  dateValue
    ? `('${dateValue}'::date + interval '8 hours')`
    : `CASE
        WHEN CURRENT_TIME < TIME '08:00:00'
          THEN (CURRENT_DATE - interval '1 day' + interval '8 hours')
        ELSE (CURRENT_DATE + interval '8 hours')
      END`;

const productionEndSql = (dateValue) =>
  dateValue
    ? `('${dateValue}'::date + interval '1 day' + interval '8 hours')`
    : `(${productionStartSql()} + interval '1 day')`;

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

  getProductionSummary: ({ lineId, dateFrom, dateTo, kanbanNo } = {}) => {
    const startDate = safeDate(dateFrom);
    const endDate = safeDate(dateTo || dateFrom);
    const startSql = productionStartSql(startDate);
    const endSql = productionEndSql(endDate);
    const safeKanban = kanbanNo ? String(kanbanNo).replace(/'/g, "''") : "";
    const kanbanFilter = safeKanban ? `AND dc.kbn_no = '${safeKanban}'` : "";

    return prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN ${lineId ? `dc.lin_id = ${Number(lineId)}` : "1 = 1"} THEN COALESCE(dc.doc_qty_total, 0) ELSE 0 END), 0) AS LineQty,
        COALESCE(SUM(COALESCE(dc.doc_qty_total, 0)), 0) AS AllLineQty
      FROM txn_double_check dc
      WHERE dc.doc_creadate >= ${startSql}
        AND dc.doc_creadate < ${endSql}
        ${kanbanFilter}
    `);
  },

  findKanbanByBarcode: (qrText) =>
    prisma.$queryRaw`
      SELECT
        k.kbn_no,
        k.kbn_device_no,
        k.kbn_cert_mark,
        k.kbn_instruction_work_path,
        k.kbn_sequence_check_path,
        k.kbn_sequence_check_voice_path,
        COALESCE(seq.next_sequence, 1) AS next_sequence
      FROM mst_kanbans k
      OUTER APPLY (
        SELECT COALESCE(MAX(doc_sequence), 0) + 1 AS next_sequence
        FROM txn_double_check dc
        WHERE dc.kbn_no = k.kbn_no
      ) seq
      WHERE k.kbn_oqc_barcode = ${String(qrText || "")}
        AND COALESCE(k.kbn_status, 0) = 1
    `,

  findKanbanMarks: (kanbanNo) =>
    prisma.$queryRaw`
      SELECT
        kbn_device_no,
        kbn_cert_mark
      FROM mst_kanbans
      WHERE kbn_no = ${String(kanbanNo || "")}
    `,

  insertCheck: (data, userFullname) =>
    prisma.$executeRaw`
      INSERT INTO txn_double_check (
        kbn_no,
        lin_id,
        doc_qr_scan,
        doc_sequence,
        doc_qty_total,
        doc_qty_ng,
        doc_creaby
      ) VALUES (
        ${data.kanbanNo},
        ${Number(data.lineId)},
        ${data.qrText},
        ${Number(data.sequence)},
        ${Number(data.qtyBox)},
        ${Number(data.qtyNg)},
        ${userFullname}
      )
    `,

  findReportRows: ({ dateFrom, dateTo, lineId, kanbanNo, pageNumber, pageSize }) => {
    const filters = [];
    const startDate = safeDate(dateFrom);
    const endDate = safeDate(dateTo);
    const page = Math.max(Number(pageNumber || 1), 1);
    const size = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * size;

    if (startDate) {
      filters.push(`dc.doc_creadate >= ${productionStartSql(startDate)}`);
    }

    if (endDate) {
      filters.push(`dc.doc_creadate < ${productionEndSql(endDate)}`);
    }

    if (lineId) {
      filters.push(`dc.lin_id = ${Number(lineId)}`);
    }

    if (kanbanNo) {
      const safeKanban = String(kanbanNo).replace(/'/g, "''");
      filters.push(`dc.kbn_no = '${safeKanban}'`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const fromClause = `
      FROM txn_double_check dc
      LEFT JOIN mst_kanbans k
        ON dc.kbn_no = k.kbn_no
      LEFT JOIN mst_lines l
        ON dc.lin_id = l.lin_id
      ${where}
    `;

    return Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          dc.doc_id,
          dc.kbn_no,
          dc.lin_id,
          dc.doc_qty_total,
          dc.doc_qty_ng,
          dc.doc_creadate,
          dc.doc_creaby,
          k.kbn_device_no,
          k.kbn_cert_mark,
          l.lin_code
        ${fromClause}
        ORDER BY dc.doc_creadate DESC, dc.doc_id DESC
        LIMIT ${size} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(1) AS TotalData,
          COALESCE(SUM(CASE
            WHEN COALESCE(dc.doc_qty_total, 0) - COALESCE(dc.doc_qty_ng, 0) < 0 THEN 0
            ELSE COALESCE(dc.doc_qty_total, 0) - COALESCE(dc.doc_qty_ng, 0)
          END), 0) AS TotalOK,
          COALESCE(SUM(COALESCE(dc.doc_qty_ng, 0)), 0) AS TotalNG
        ${fromClause}
      `),
    ]);
  },
};

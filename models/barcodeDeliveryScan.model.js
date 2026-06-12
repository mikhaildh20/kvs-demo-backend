import prisma from "./prisma.js";

let tableReady = false;
const collate = "Latin1_General_CI_AS";

const safeDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "");

const escapeSql = (value) => String(value || "").replace(/'/g, "''");

export const BarcodeDeliveryScanModel = {
  async ensureTable() {
    tableReady = true;
  },
  insertImportRow: (row, userFullname) =>
    prisma.$executeRaw`
      INSERT INTO txn_barcode_delivery_scan (
        bds_ship_date,
        bds_ship_no,
        bds_so_no,
        bds_po_no,
        kbn_no,
        cst_code,
        bds_qty_perbox,
        bds_box_qty,
        bds_status,
        bds_creaby
      ) VALUES (
        CAST(${row.shipDate} AS date),
        ${row.shipNo},
        ${row.soNo},
        ${row.poNo},
        ${row.kanbanNo},
        ${row.customerCode},
        ${Number(row.qtyPerBox || 0)},
        ${Number(row.boxQty || 0)},
        0,
        ${userFullname}
      )
    `,

  findPaged: (query = {}) => {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const offset = (pageNumber - 1) * pageSize;
    const filters = [];

    if (query.Keyword) {
      const keyword = escapeSql(query.Keyword);
      filters.push(`(
        bds.bds_ship_no LIKE '%${keyword}%'
        OR bds.bds_so_no LIKE '%${keyword}%'
        OR bds.bds_po_no LIKE '%${keyword}%'
        OR bds.kbn_no LIKE '%${keyword}%'
        OR bds.cst_code LIKE '%${keyword}%'
        OR c.cst_name LIKE '%${keyword}%'
      )`);
    }

    if (safeDate(query.ShipDate)) {
      filters.push(`bds.bds_ship_date = '${safeDate(query.ShipDate)}'`);
    }

    if (safeDate(query.DateFrom)) {
      filters.push(`bds.bds_ship_date >= '${safeDate(query.DateFrom)}'`);
    }

    if (safeDate(query.DateTo)) {
      filters.push(`bds.bds_ship_date <= '${safeDate(query.DateTo)}'`);
    }

    if (query.PoNo) {
      filters.push(`bds.bds_po_no = '${escapeSql(query.PoNo)}'`);
    }

    if (query.KanbanNo) {
      filters.push(`bds.kbn_no = '${escapeSql(query.KanbanNo)}'`);
    }

    if (query.Status !== undefined && query.Status !== null && query.Status !== "") {
      filters.push(`COALESCE(bds.bds_status, 0) = ${Number(query.Status)}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const orderMap = {
      bds_ship_date: "bds.bds_ship_date",
      bds_po_no: "bds.bds_po_no",
      kbn_no: "bds.kbn_no",
      bds_status: "bds.bds_status",
    };
    const [rawColumn, rawDirection] = String(query.Urut || "bds_ship_date DESC").split(/\s+/);
    const orderColumn = orderMap[rawColumn] || "bds.bds_ship_date";
    const orderDirection = String(rawDirection || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const fromClause = `
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      ${where}
    `;

    return Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          bds.bds_ship_date,
          bds.bds_ship_no,
          bds.bds_so_no,
          bds.bds_po_no,
          bds.kbn_no,
          bds.cst_code,
          bds.bds_qty_perbox,
          bds.bds_box_qty,
          bds.bds_status,
          bds.bds_creadate,
          bds.bds_creaby,
          COALESCE(scanned.scanned_box, 0) AS scanned_box,
          CASE
            WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
            ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
          END AS remaining_box,
          c.cst_name
        ${fromClause}
        ORDER BY ${orderColumn} ${orderDirection}, bds.bds_po_no ASC, bds.kbn_no ASC
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(1) AS TotalData
        ${fromClause}
      `),
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(1) AS TotalData,
          COALESCE(SUM(CASE
            WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
            ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
          END), 0) AS TotalRemaining,
          COALESCE(SUM(CASE WHEN COALESCE(bds.bds_status, 0) = 1 THEN 1 ELSE 0 END), 0) AS TotalDone,
          COALESCE(SUM(CASE WHEN COALESCE(bds.bds_status, 0) = 0 THEN 1 ELSE 0 END), 0) AS TotalOpen
        ${fromClause}
      `),
    ]);
  },

  findPoOptions: ({ shipDate }) => {
    const date = safeDate(shipDate);
    const where = date ? `WHERE bds.bds_ship_date = '${date}'` : "";

    return prisma.$queryRawUnsafe(`
      SELECT
        bds.bds_po_no,
        MAX(c.cst_name) AS cst_name,
        SUM(COALESCE(bds.bds_box_qty, 0)) AS total_box,
        SUM(COALESCE(scanned.scanned_box, 0)) AS scanned_box
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      ${where}
      GROUP BY bds.bds_po_no
      ORDER BY bds.bds_po_no ASC
    `);
  },

  findKanbanOptions: ({ shipDate, poNo }) => {
    const date = safeDate(shipDate);
    const safePo = String(poNo || "").replace(/'/g, "''");
    const filters = [];
    if (date) filters.push(`bds.bds_ship_date = '${date}'`);
    if (safePo) filters.push(`bds.bds_po_no = '${safePo}'`);
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    return prisma.$queryRawUnsafe(`
      SELECT
        bds.bds_ship_date,
        bds.bds_ship_no,
        bds.bds_so_no,
        bds.bds_po_no,
        bds.kbn_no,
        bds.cst_code,
        bds.bds_box_qty,
        COALESCE(scanned.scanned_box, 0) AS scanned_box,
        CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END AS remaining_box,
        bds.bds_status,
        c.cst_name,
        latest.pnu_code,
        latest.pnu_part_desc,
        k.kbn_logistic_guide_path,
        k.kbn_logistic_guide_voice_path,
        k.kbn_oqc_barcode
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_kanbans k
        ON bds.kbn_no = k.kbn_no
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      LEFT JOIN LATERAL (
        SELECT pnu_code, pnu_part_desc
        FROM detail_kanban_part_number p
        WHERE p.kbn_no = bds.kbn_no
          AND COALESCE(p.pnu_status, 0) = 1
        ORDER BY p.pnu_latest_date DESC
        LIMIT 1
      ) latest ON true
      ${where}
      ORDER BY bds.kbn_no ASC
    `);
  },

  findScanTarget: (key) =>
    prisma.$queryRaw`
      SELECT
        bds.bds_ship_date,
        bds.bds_ship_no,
        bds.bds_so_no,
        bds.bds_po_no,
        bds.kbn_no,
        bds.cst_code,
        bds.bds_box_qty,
        COALESCE(scanned.scanned_box, 0) AS scanned_box,
        CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END AS remaining_box,
        bds.bds_status,
        c.cst_name,
        k.kbn_logistic_guide_path,
        k.kbn_logistic_guide_voice_path,
        k.kbn_oqc_barcode
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_kanbans k
        ON bds.kbn_no = k.kbn_no
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      WHERE bds.bds_ship_date = CAST(${key.shipDate} AS date)
        AND bds.bds_ship_no = ${key.shipNo}
        AND bds.bds_so_no = ${key.soNo}
        AND bds.bds_po_no = ${key.poNo}
        AND bds.kbn_no = ${key.kanbanNo}
    `,

  findScanTargetByPoKanban: ({ shipDate, poNo, kanbanNo }) =>
    prisma.$queryRaw`
      SELECT
        bds.bds_ship_date,
        bds.bds_ship_no,
        bds.bds_so_no,
        bds.bds_po_no,
        bds.kbn_no,
        bds.cst_code,
        bds.bds_box_qty,
        COALESCE(scanned.scanned_box, 0) AS scanned_box,
        CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END AS remaining_box,
        bds.bds_status,
        c.cst_name,
        k.kbn_logistic_guide_path,
        k.kbn_logistic_guide_voice_path,
        k.kbn_oqc_barcode
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_kanbans k
        ON bds.kbn_no = k.kbn_no
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      WHERE bds.bds_ship_date = CAST(${shipDate} AS date)
        AND bds.bds_po_no = ${poNo}
        AND bds.kbn_no = ${kanbanNo}
      ORDER BY bds.bds_ship_no ASC, bds.bds_so_no ASC
    `,

  insertScanDetail: (key, data, userFullname) =>
    prisma.$executeRaw`
      INSERT INTO txn_barcode_delivery_scan_detail (
        bds_ship_date,
        bds_ship_no,
        bds_so_no,
        bds_po_no,
        kbn_no,
        bds_barcode_pik,
        bds_barcode_cst,
        bds_barcode_oqc,
        bds_veriby
      ) VALUES (
        CAST(${key.shipDate} AS date),
        ${key.shipNo},
        ${key.soNo},
        ${key.poNo},
        ${key.kanbanNo},
        ${data.pikBarcode},
        ${data.customerBarcode},
        ${data.oqcBarcode},
        ${userFullname}
      )
    `,

  updateHeaderStatus: (key) =>
    prisma.$executeRaw`
      UPDATE txn_barcode_delivery_scan
      SET bds_status = CASE
        WHEN (
          SELECT COUNT(1)
          FROM txn_barcode_delivery_scan_detail d
          WHERE d.bds_ship_date = txn_barcode_delivery_scan.bds_ship_date
            AND d.bds_ship_no = txn_barcode_delivery_scan.bds_ship_no
            AND d.bds_so_no = txn_barcode_delivery_scan.bds_so_no
            AND d.bds_po_no = txn_barcode_delivery_scan.bds_po_no
            AND d.kbn_no = txn_barcode_delivery_scan.kbn_no
        ) >= COALESCE(bds_box_qty, 0) THEN 1 ELSE 0 END
      WHERE bds_ship_date = CAST(${key.shipDate} AS date)
        AND bds_ship_no = ${key.shipNo}
        AND bds_so_no = ${key.soNo}
        AND bds_po_no = ${key.poNo}
        AND kbn_no = ${key.kanbanNo}
    `,

  findOqcIdsByKanban: (kanbanNo) =>
    prisma.$queryRaw`
      SELECT oqc_id
      FROM txn_ongoing_quality_check
      WHERE kbn_no = ${String(kanbanNo || "")}
      ORDER BY oqc_creadate DESC, oqc_id DESC
    `,

  findPoReportRows: ({ dateFrom, dateTo, poNo, status, pageNumber, pageSize }) => {
    const page = Math.max(Number(pageNumber || 1), 1);
    const size = Math.max(Number(pageSize || 10), 1);
    const offset = (page - 1) * size;
    const filters = [];

    if (safeDate(dateFrom)) filters.push(`bds.bds_ship_date >= '${safeDate(dateFrom)}'`);
    if (safeDate(dateTo)) filters.push(`bds.bds_ship_date <= '${safeDate(dateTo)}'`);
    if (poNo) filters.push(`bds.bds_po_no = '${escapeSql(poNo)}'`);

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const statusFilter =
      status === undefined || status === null || status === ""
        ? ""
        : `WHERE grouped.Status = ${Number(status)}`;

    const grouped = `
      SELECT
        bds.bds_ship_date,
        bds.bds_po_no,
        MAX(c.cst_name) AS cst_name,
        COUNT(1) AS TotalKanban,
        SUM(COALESCE(bds.bds_box_qty, 0)) AS TotalBox,
        SUM(COALESCE(scanned.scanned_box, 0)) AS ScannedBox,
        SUM(CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END) AS RemainingBox,
        CASE WHEN SUM(CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END) = 0 THEN 1 ELSE 0 END AS Status
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      ${where}
      GROUP BY bds.bds_ship_date, bds.bds_po_no
    `;

    const fromGrouped = `FROM (${grouped}) grouped ${statusFilter}`;

    return Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT *
        ${fromGrouped}
        ORDER BY grouped.bds_ship_date DESC, grouped.bds_po_no ASC
        LIMIT ${size} OFFSET ${offset}
      `),
      prisma.$queryRawUnsafe(`
        SELECT COUNT(1) AS TotalData
        ${fromGrouped}
      `),
      prisma.$queryRawUnsafe(`
        SELECT
          COUNT(1) AS TotalPo,
          COALESCE(SUM(TotalBox), 0) AS TotalBox,
          COALESCE(SUM(ScannedBox), 0) AS ScannedBox,
          COALESCE(SUM(RemainingBox), 0) AS RemainingBox,
          COALESCE(SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), 0) AS DonePo,
          COALESCE(SUM(CASE WHEN Status = 0 THEN 1 ELSE 0 END), 0) AS OpenPo
        ${fromGrouped}
      `),
    ]);
  },

  findPoDetailRows: ({ shipDate, poNo }) =>
    prisma.$queryRawUnsafe(`
      SELECT
        bds.bds_ship_date,
        bds.bds_ship_no,
        bds.bds_so_no,
        bds.bds_po_no,
        bds.kbn_no,
        bds.cst_code,
        bds.bds_qty_perbox,
        bds.bds_box_qty,
        c.cst_name,
        latest.pnu_code,
        latest.pnu_part_desc,
        COALESCE(scanned.scanned_box, 0) AS scanned_box,
        CASE
          WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) < 0 THEN 0
          ELSE COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0)
        END AS remaining_box,
        CASE WHEN COALESCE(bds.bds_box_qty, 0) - COALESCE(scanned.scanned_box, 0) <= 0 THEN 1 ELSE 0 END AS status
      FROM txn_barcode_delivery_scan bds
      LEFT JOIN mst_customers c
        ON bds.cst_code = c.cst_code
      LEFT JOIN LATERAL (
        SELECT pnu_code, pnu_part_desc
        FROM detail_kanban_part_number p
        WHERE p.kbn_no = bds.kbn_no
          AND COALESCE(p.pnu_status, 0) = 1
        ORDER BY p.pnu_latest_date DESC
        LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(1) AS scanned_box
        FROM txn_barcode_delivery_scan_detail d
        WHERE d.bds_ship_date = bds.bds_ship_date
          AND d.bds_ship_no = bds.bds_ship_no
          AND d.bds_so_no = bds.bds_so_no
          AND d.bds_po_no = bds.bds_po_no
          AND d.kbn_no = bds.kbn_no
      ) scanned ON true
      WHERE bds.bds_ship_date = '${safeDate(shipDate)}'
        AND bds.bds_po_no = '${escapeSql(poNo)}'
      ORDER BY bds.kbn_no ASC
    `),

  lockUser: (userId) =>
    prisma.mst_users.update({
      where: { usr_id: Number(userId) },
      data: { usr_isLocked: 1 },
    }),
};

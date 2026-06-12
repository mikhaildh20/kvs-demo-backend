import prisma from './prisma.js';

const buildWhere = ({ Keyword, Status }) => {
    const where = {};

    if(Keyword){
        where.OR = [
            { kbn_no: { contains: Keyword} },
            { oqc_lot_no: { contains: Keyword} },
        ];
    }

    if(Status !== undefined && Status !== null && Status !== ""){
        where.oqc_status = Number(Status);
    }

    return where;
};

const resolveSort = (sortValue = "oqc_creadate DESC") => {
    const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
    const columnMap = {
        kbn_no: "kbn_no",
        oqc_lot_no: "oqc_lot_no",
        oqc_creadate: "oqc_creadate",
        No: "kbn_no",
        LotNo: "oqc_lot_no",
        Creadate: "oqc_creadate",
    };

    const column = columnMap[rawColumn] || "oqc_creadate";
    const direction = String(rawDirection || "DESC").toLocaleLowerCase() === "asc" ? "asc" : "desc";
    return { [column]: direction };
};

export const OQCModel = {
    async findPaged(query) {
        const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
        const pageSize = Math.max(Number(query.PageSize || 10), 1);
        const where = buildWhere(query);

        const [data, totalData] = await Promise.all([
            prisma.txn_ongoing_quality_check.findMany({
                where,
                orderBy: resolveSort(query.Urut),
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            }),
            prisma.txn_ongoing_quality_check.count({ where }),
        ]);

        return { data, totalData };
    },

    findById: (id) =>
        prisma.txn_ongoing_quality_check.findUnique({
            where: { oqc_id: Number(id) },
        }),

    findKanbanForPreview: (kanbanNo) =>
        prisma.mst_kanbans.findUnique({
            where: { kbn_no: String(kanbanNo) },
            include: {
                mst_customers: {
                    include: {
                        mst_suppliers: true,
                        mst_qr_formats: true,
                    },
                },
                detail_kanban_part_number: {
                    where: {
                        pnu_status: 1,
                    },
                    orderBy: {
                        pnu_latest_date: "desc",
                    },
                },
            },
        }),

    create: (data, userFullname) =>
        prisma.txn_ongoing_quality_check.create({
            data: {
                kbn_no: data.no,
                oqc_lot_no: data.lotNo,
                oqc_qty_box: Number(data.qtyBox ?? 0),
                oqc_qty_plan: Number(data.qtyPlan ?? 0),
                oqc_total_label: Number(data.totalLabel ?? 0),
                oqc_total_A4: Number(data.totalA4 ?? 0),
                oqc_status: Number(data.status ?? 0),
                oqc_creaby: userFullname,
            },
        }),

    async sumTotalLabelByKanbanLotAndDate(kanbanNo, lotNo, dateValue, beforeId = null) {
        const baseDate = new Date(dateValue || new Date());
        const start = new Date(baseDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const rows = await prisma.txn_ongoing_quality_check.findMany({
            where: {
                kbn_no: String(kanbanNo || ""),
                oqc_lot_no: String(lotNo || ""),
                oqc_creadate: {
                    gte: start,
                    lt: end,
                },
                ...(beforeId ? { oqc_id: { lt: Number(beforeId) } } : {}),
            },
            select: {
                oqc_total_label: true,
            },
        });

        return rows.reduce((total, row) => total + Number(row.oqc_total_label || 0), 0);
    },
};

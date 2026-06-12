import prisma from "./prisma.js";

const chunk = (data, size = 300) => {
    const chunks = [];

    for (let i = 0; i < data.length; i += size) {
        chunks.push(data.slice(i, i + size));
    }

    return chunks;
};

export const normalizeDate = (date) => {
    if (!date) return null;

    const d = new Date(date);

    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const toDetailKey = (row) => {
    const normalizedDate = normalizeDate(row.pnu_latest_date);
    if (!normalizedDate) return null;

    return [row.pnu_code, row.kbn_no, normalizedDate.getTime()].join("_");
};

export const bulkInsertKanban = async (data) => {
    if (!data.length) return;

    const deduped = Array.from(
        new Map(
            data.map((row) => [
                row.kbn_no,
                {
                    ...row,
                },
            ])
        ).values()
    );

    const existing = await prisma.mst_kanbans.findMany({
        where: {
            kbn_no: { in: deduped.map((row) => row.kbn_no) },
        },
        select: { kbn_no: true },
    });

    const existingNos = new Set(existing.map((row) => row.kbn_no));
    const toCreate = deduped.filter((row) => !existingNos.has(row.kbn_no));

    for (const batch of chunk(toCreate, 1000)) {
        await prisma.mst_kanbans.createMany({
            data: batch,
        });
    }
};

const dedupeDetail = (data) => {
    const map = new Map();

    for (const row of data) {
        const normalizedDate = normalizeDate(row.pnu_latest_date);

        if (!normalizedDate) continue;

        const key = [
            row.pnu_code,
            row.kbn_no,
            normalizedDate.getFullYear(),
            normalizedDate.getMonth(),
            normalizedDate.getDate(),
        ].join("_");

        map.set(key, {
            ...row,
            pnu_latest_date: normalizedDate,
        });
    }

    return Array.from(map.values());
};

export const bulkInsertDetail = async (data) => {
    if (!data.length) return;

    const deduped = dedupeDetail(data);
    if (!deduped.length) return;

    const uniqueCodes = [...new Set(deduped.map((row) => row.pnu_code))];
    const uniqueKanbans = [...new Set(deduped.map((row) => row.kbn_no))];
    const uniqueDates = [
        ...new Set(
            deduped
                .map((row) => normalizeDate(row.pnu_latest_date)?.getTime())
                .filter(Boolean)
        ),
    ].map((ms) => new Date(ms));

    const existingRows = await prisma.detail_kanban_part_number.findMany({
        where: {
            pnu_code: { in: uniqueCodes },
            kbn_no: { in: uniqueKanbans },
            pnu_latest_date: { in: uniqueDates },
        },
        select: {
            pnu_code: true,
            kbn_no: true,
            pnu_latest_date: true,
        },
    });

    const existingKeys = new Set(existingRows.map((row) => toDetailKey(row)).filter(Boolean));
    const toCreate = [];
    const toUpdate = [];

    for (const row of deduped) {
        const normalizedRow = {
            ...row,
            pnu_latest_date: normalizeDate(row.pnu_latest_date),
        };
        const key = toDetailKey(normalizedRow);
        if (!key) continue;

        if (existingKeys.has(key)) {
            toUpdate.push(normalizedRow);
        } else {
            toCreate.push(normalizedRow);
        }
    }

    for (const batch of chunk(toCreate, 1000)) {
        await prisma.detail_kanban_part_number.createMany({
            data: batch,
        });
    }

    const now = new Date();
    for (const batch of chunk(toUpdate, 50)) {
        await Promise.all(
            batch.map((row) =>
                prisma.detail_kanban_part_number.updateMany({
                    where: {
                        pnu_code: row.pnu_code,
                        kbn_no: row.kbn_no,
                        pnu_latest_date: row.pnu_latest_date,
                    },
                    data: {
                        pnu_part_number: row.pnu_part_number,
                        pnu_part_desc: row.pnu_part_desc,
                        pnu_modidate: now,
                        pnu_modiby: "PRONES",
                    },
                })
            )
        );
    }
};

const buildWhere = ({ Keyword, Status, Special }) => {
    const where = {};

    if (Keyword) {
        where.OR = [
            { kbn_no: { contains: Keyword } },
            { kbn_uniq_no: { contains: Keyword } },
            { mst_colors: { is: { clr_name: { contains: Keyword } } } },
            { mst_customers: { is: { cst_name: { contains: Keyword } } } },
        ];

        const qtyKeyword = Number(Keyword);
        if (!Number.isNaN(qtyKeyword)) {
            where.OR.push({ kbn_qty_box: qtyKeyword });
        }
    }

    if (Status !== undefined && Status !== null && Status !== "") {
        where.kbn_status = Number(Status);
    }

    if (Special !== undefined && Special !== null && Special !== "") {
        where.kbn_isSpecial = Number(Special);
    }

    return where;
};

const resolveSort = (sortValue = "kbn_no ASC") => {
    const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
    const columnMap = {
        kbn_no: "kbn_no",
        kbn_uniq_no: "kbn_uniq_no",
        kbn_qty_box: "kbn_qty_box",
        No: "kbn_no",
        UniqNo: "kbn_uniq_no",
        QtyBox: "kbn_qty_box",
    };
    const column = columnMap[rawColumn] || "kbn_no";
    const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";

    return { [column]: direction };
};

export const KanbanModel = {
    async findPaged(query) {
        const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
        const pageSize = Math.max(Number(query.PageSize || 10), 1);
        const where = buildWhere(query);

        const [data, totalData] = await Promise.all([
            prisma.mst_kanbans.findMany({
                where,
                include: {
                    mst_colors: true,
                    mst_customers: true,
                },
                orderBy: resolveSort(query.Urut),
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mst_kanbans.count({ where }),
        ]);

        return { data, totalData };
    },

    findById: (id) =>
        prisma.mst_kanbans.findUnique({
            where: { kbn_no: String(id) },
            include: {
                mst_colors: true,
                mst_customers: true,
                detail_kanban_part_number: {
                    orderBy: {
                        pnu_latest_date: "desc",
                    },
                },
            },
        }),

    async create(data, userFullname) {
        const row = {
            kbn_no: String(data.no || "").trim(),
            clr_id: data.colorId ? Number(data.colorId) : null,
            kbn_uniq_no: String(data.uniqNo ?? "").trim() || null,
            kbn_qty_box: data.qtyBox ? Number(data.qtyBox) : null,
            kbn_isSpecial: 0,
            kbn_sequence_check_desc: data.sequenceCheckDesc || null,
            kbn_logistic_guide_desc: data.logisticGuideDesc || null,
            kbn_instruction_work_path: data.instructionWorkPath || null,
            kbn_sequence_check_path: data.sequenceCheckPath || null,
            kbn_logistic_guide_path: data.logisticGuidePath || null,
            kbn_sequence_check_voice_path: data.sequenceCheckVoicePath || null,
            kbn_logistic_guide_voice_path: data.logisticGuideVoicePath || null,
            kbn_stamp: data.stamp || null,
            kbn_device_no: String(data.deviceNo ?? "").trim() || null,
            kbn_cert_mark: String(data.certMark ?? "").trim() || null,
            kbn_remark: data.remark || null,
            kbn_status: 1,
            kbn_creaby: userFullname,
        };

        await prisma.$executeRaw`
            INSERT INTO mst_kanbans (
                kbn_no,
                clr_id,
                kbn_uniq_no,
                kbn_qty_box,
                kbn_isSpecial,
                kbn_sequence_check_desc,
                kbn_logistic_guide_desc,
                kbn_instruction_work_path,
                kbn_sequence_check_path,
                kbn_logistic_guide_path,
                kbn_sequence_check_voice_path,
                kbn_logistic_guide_voice_path,
                kbn_stamp,
                kbn_device_no,
                kbn_cert_mark,
                kbn_remark,
                kbn_status,
                kbn_creaby
            ) VALUES (
                ${row.kbn_no},
                ${row.clr_id},
                ${row.kbn_uniq_no},
                ${row.kbn_qty_box},
                ${row.kbn_isSpecial},
                ${row.kbn_sequence_check_desc},
                ${row.kbn_logistic_guide_desc},
                ${row.kbn_instruction_work_path},
                ${row.kbn_sequence_check_path},
                ${row.kbn_logistic_guide_path},
                ${row.kbn_sequence_check_voice_path},
                ${row.kbn_logistic_guide_voice_path},
                ${row.kbn_stamp},
                ${row.kbn_device_no},
                ${row.kbn_cert_mark},
                ${row.kbn_remark},
                ${row.kbn_status},
                ${row.kbn_creaby}
            )
        `;

        return row;
    },

    update: (id, data, userFullname) => {
        const hasUniqNo = Object.prototype.hasOwnProperty.call(data, "uniqNo");

        const updateData = {
            clr_id: data.colorId ? Number(data.colorId) : null,
            kbn_uniq_no: hasUniqNo ? String(data.uniqNo ?? "").trim() || null : data.kbn_uniq_no,
            kbn_qty_box: data.qtyBox ? Number(data.qtyBox) : null,
            kbn_sequence_check_desc: data.sequenceCheckDesc ?? data.kbn_sequence_check_desc,
            kbn_logistic_guide_desc: data.logisticGuideDesc ?? data.kbn_logistic_guide_desc,
            kbn_instruction_work_path: data.instructionWorkPath ?? data.kbn_instruction_work_path,
            kbn_sequence_check_path: data.sequenceCheckPath ?? data.kbn_sequence_check_path,
            kbn_logistic_guide_path: data.logisticGuidePath ?? data.kbn_logistic_guide_path,
            kbn_sequence_check_voice_path: data.sequenceCheckVoicePath ?? data.kbn_sequence_check_voice_path,
            kbn_logistic_guide_voice_path: data.logisticGuideVoicePath ?? data.kbn_logistic_guide_voice_path,
            kbn_stamp: data.stamp ?? data.kbn_stamp,
            kbn_device_no: Object.prototype.hasOwnProperty.call(data, "deviceNo") ? String(data.deviceNo ?? "").trim() || null : data.kbn_device_no,
            kbn_cert_mark: Object.prototype.hasOwnProperty.call(data, "certMark") ? String(data.certMark ?? "").trim() || null : data.kbn_cert_mark,
            kbn_remark: data.remark ?? data.kbn_remark,
            kbn_modidate: new Date(),
            kbn_modiby: userFullname,
        };

        return prisma.mst_kanbans.update({
            where: { kbn_no: String(id) },
            data: updateData,
        });
    },

    toggleStatus: async (id, userFullname) => {
        const kanban = await prisma.mst_kanbans.findUnique({
            where: { kbn_no: String(id) },
        });

        if (!kanban) {
            throw new Error("Kanban not found");
        }

        return prisma.mst_kanbans.update({
            where: { kbn_no: String(id) },
            data: {
                kbn_status: kanban.kbn_status === 1 ? 0 : 1,
                kbn_modidate: new Date(),
                kbn_modiby: userFullname,
            },
        });
    },

    toggleSpecial: async (id, userFullname) => {
        const kanban = await prisma.mst_kanbans.findUnique({
            where: { kbn_no: String(id) },
        });

        if (!kanban) {
            throw new Error("Kanban not found");
        }

        return prisma.mst_kanbans.update({
            where: { kbn_no: String(id) },
            data: {
                kbn_isSpecial: kanban.kbn_isSpecial === 1 ? 0 : 1,
                kbn_modidate: new Date(),
                kbn_modiby: userFullname,
            },
        });
    },

    findDropdownList: () =>
    prisma.mst_kanbans.findMany({
        where: {
            clr_id: {
                not: null,
            },

            cst_id: {
                not: null,
            },

            kbn_qty_box: {
                not: 0,
            },

            kbn_status: 1,

            // 🔥 customer wajib punya spl_id & qfm_id
            mst_customers: {
                spl_id: {
                    not: null,
                },

                qfm_id: {
                    not: null,
                },
            },
        },

        select: {
            kbn_no: true,
            kbn_qty_box: true,
            kbn_isSpecial: true,

            mst_customers: {
                select: {
                    cst_name: true,
                },
            },

            mst_colors: {
                select: {
                    clr_name: true,
                },
            },
        },

        orderBy: {
            kbn_no: "asc",
        },
    }),

    findDropdownListPartNumber: (id) =>
        prisma.detail_kanban_part_number.findMany({
            where: {
                kbn_no: id,
            },
            select: {
                pnu_part_number: true,
                pnu_part_desc: true,
                pnu_latest_date: true,
            },
            orderBy: {
                pnu_latest_date: "desc",
            },
        }),
};

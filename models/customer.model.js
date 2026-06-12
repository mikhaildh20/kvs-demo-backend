import prisma from "./prisma.js";

const chunk = (data, size = 300) => {
    const chunks = [];

    for (let i = 0; i < data.length; i += size) {
        chunks.push(data.slice(i, i + size));
    }

    return chunks;
};

export const findCustomersByCodes =
    async (codes) => {

        return prisma.mst_customers.findMany({
            where: {
                cst_code: {
                    in: codes,
                },
            },
        });
    };

export const bulkInsertCustomer =
    async (data) => {

        if (!data.length) return;

        const deduped = Array.from(
            new Map(
                data.map((row) => [
                    row.cst_code,
                    row,
                ])
            ).values()
        );

        for (const batch of chunk(deduped, 100)) {
            for (const row of batch) {
                await prisma.mst_customers.upsert({
                    where: {
                        cst_code: row.cst_code,
                    },
                    update: {
                        cst_name: row.cst_name,
                        cst_modidate: new Date(),
                        cst_modiby: "PRONES",
                    },
                    create: {
                        ...row,
                        cst_status: 1,
                        cst_creaby: "PRONES",
                    },
                });
            }
        }
    };

const buildWhere = ({ Keyword, Status}) => {
    const where = {};

    if (Keyword) {
        where.OR = [
            { cst_code: { contains: Keyword } },
            { cst_name: { contains: Keyword } },
        ];
    }

    if (Status !== undefined && Status !== null && Status !== "") {
        where.cst_status = Number(Status);
    }

    return where;
};

const resolveSort = (sortValue = "cst_name ASC") => {
    const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
    const columnMap = {
        cst_code: "cst_code",
        cst_name: "cst_name",
        Code: "cst_code",
        Name: "cst_name",
    };
    const column = columnMap[rawColumn] || "cst_name";
    const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
    return { [column]: direction };
};

export const CustomerModel = {
    async findPaged(query) {
        const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
        const pageSize = Math.max(Number(query.PageSize || 10), 1);
        const where = buildWhere(query);

        const [data, totalData] = await Promise.all([
            prisma.mst_customers.findMany({
                where,
                include: {
                    mst_suppliers: true,
                },
                orderBy: resolveSort(query.Urut),
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mst_customers.count({ where }),
        ]);

        return { data, totalData };
    },

    findById: (id) =>
        prisma.mst_customers.findUnique({
            where: { cst_id: Number(id) },
        }),

    findAssignableKanbans: (customerId) =>
        prisma.mst_kanbans.findMany({
            where: {
                OR: [
                    { cst_id: null },
                    { cst_id: Number(customerId) },
                ],
            },
            include: {
                mst_colors: true,
            },
            orderBy: {
                kbn_no: "asc",
            },
        }),

    assignKanbans: (id, kanbanIds, userFullname) =>
        prisma.mst_kanbans.updateMany({
            where: {
                kbn_no: {
                    in: kanbanIds.map((kanbanId) => String(kanbanId)),
                },
                OR: [
                    { cst_id: null },
                    { cst_id: Number(id) },
                ],
            },
            data: {
                cst_id: Number(id),
                kbn_modidate: new Date(),
                kbn_modiby: userFullname,
            },
        }),

    create: (data, userFullname) =>
        prisma.mst_customers.create({
            data: {
                cst_code: data.code,
                cst_name: data.name,
                cst_photo_path: data.photoPath,
                cst_status: Number(data.status ?? 1),
                cst_creaby: userFullname,
            },
        }),

    update: (id, data, userFullname) => {
        const updateData = {
            cst_code: data.code,
            cst_name: data.name,
            cst_photo_path: data.photoPath,
            cst_modidate: new Date(),
            cst_modiby: userFullname,
        };

        return prisma.mst_customers.update({
            where: { cst_id: Number(id) },
            data: updateData,
        });
    },

    toggleStatus: async (id, userFullname) => {
        const customer = await prisma.mst_customers.findUnique({
            where: { cst_id: Number(id) },
        });

        if (!customer) {
            throw new Error("Customer not found");
        }

        return prisma.mst_customers.update({
            where: { cst_id: Number(id) },
            data: {
                cst_status: customer.cst_status === 1 ? 0 : 1,
                cst_modidate: new Date(),
                cst_modiby: userFullname,
            },
        });
    }
};

import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status}) => {
    const where = {};

    if (Keyword) {
        where.clr_name = {
            contains: Keyword,
        };
    }

    if (Status !== undefined && Status !== null && Status !== "") {
        where.clr_status = Number(Status);
    }

    return where;
};

const resolveSort = (sortValue = "clr_name ASC") => {
    const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
    const columnMap = {
        clr_name: "clr_name",
        Name: "clr_name",
    };
    const column = columnMap[rawColumn] || "clr_name";
    const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
    return { [column]: direction };
};

export const ColorModel = {
    async findPaged(query) {
        const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
        const pageSize = Math.max(Number(query.PageSize || 10), 1);
        const where = buildWhere(query);

        const [data, totalData] = await Promise.all([
            prisma.mst_colors.findMany({
                where,
                orderBy: resolveSort(query.Urut),
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mst_colors.count({ where }),
        ]);
        
        return { data, totalData };
    },

    findById: (id) =>
        prisma.mst_colors.findUnique({
            where: { clr_id: Number(id) },
        }),

    create: (data, userFullname) =>
        prisma.mst_colors.create({
            data: {
                clr_name: data.name,
                clr_status: Number(data.status ?? 1),
                clr_creaby: userFullname,
            },
        }),

    update: (id, data, userFullname) =>{
        const updateData = {
            clr_name: data.name,
            clr_modidate: new Date(),
            clr_modiby: userFullname,
        };

        return prisma.mst_colors.update({
            where: { clr_id: Number(id) },
            data: updateData,
        });
    },

    toggleStatus: async (id, userFullname) => {
        const color = await prisma.mst_colors.findUnique({
            where: { clr_id: Number(id) },
        });

        if (!color) {
            throw new Error("Color not found");
        }

        return prisma.mst_colors.update({
            where: { clr_id: Number(id) },
            data: {
                clr_status: color.clr_status === 1 ? 0 : 1,
                clr_modidate: new Date(),
                clr_modiby: userFullname,
            },
        });
    }
};
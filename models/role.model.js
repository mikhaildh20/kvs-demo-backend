import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status}) => {
    const where = {
        rol_id: { not: 1 },
    };

    if (Keyword) {
        where.rol_name = {
            contains: Keyword,
        };
    }

    if (Status !== undefined && Status !== null && Status !== "") {
        where.rol_status = Number(Status);
    }

    return where;
};

const resolveSort = (sortValue = "rol_name ASC") => {
    const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
    const columnMap = {
        rol_name: "rol_name",
        Name: "rol_name",
    };
    const column = columnMap[rawColumn] || "rol_name";
    const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
    return { [column]: direction };
};

export const RoleModel = {
    async findPaged(query) {
        const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
        const pageSize = Math.max(Number(query.PageSize || 10), 1);
        const where = buildWhere(query);

        const [data, totalData] = await Promise.all([
            prisma.mst_roles.findMany({
                where,
                orderBy: resolveSort(query.Urut),
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mst_roles.count({ where }),
        ]);

        return { data, totalData };
    },

    findById: (id) =>
        prisma.mst_roles.findUnique({
            where: { rol_id: Number(id) },
        }),

    create: (data, userFullname) =>
        prisma.mst_roles.create({
            data: {
                rol_name: data.name,
                rol_status: Number(data.status ?? 1),
                rol_creaby: userFullname,
            },
        }),

    update: (id, data, userFullname) => {
        const updateData = {
            rol_name: data.name,
            rol_modidate: new Date(),
            rol_modiby: userFullname,
        };

        return prisma.mst_roles.update({
            where: { rol_id: Number(id) },
            data: updateData,
        });
    },

    toggleStatus: async (id, userFullname) => {
        const role = await prisma.mst_roles.findUnique({
            where: { rol_id: Number(id) },
        });

        if (!role) {
            throw new Error("Role not found");
        }

        return prisma.mst_roles.update({
            where: { rol_id: Number(id) },
            data: {
                rol_status: role.rol_status === 1 ? 0 : 1,
                rol_modidate: new Date(),
                rol_modiby: userFullname,
            },
        });
    },

    findAllMenus: () =>
        prisma.mst_menus.findMany({
            where: {
                mnu_status: 1,
            },
            orderBy: {
                mnu_name: "asc",
            },
        }),

    findAssignedMenuIds: async (roleId) => {
        const rows = await prisma.detail_menu.findMany({
            where: {
                rol_id: Number(roleId),
                dtm_status: 1,
            },
            select: {
                mnu_id: true,
            },
        });

        return rows.map((item) => item.mnu_id);
    },

    assignMenus: async (roleId, menuIds, userFullname) => {
        const safeMenuIds = [...new Set(menuIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
        const now = new Date();

        return prisma.$transaction(async (tx) => {
            await tx.detail_menu.deleteMany({
                where: {
                    rol_id: Number(roleId),
                },
            });

            if (safeMenuIds.length === 0) {
                return { count: 0 };
            }

            return tx.detail_menu.createMany({
                data: safeMenuIds.map((menuId) => ({
                    rol_id: Number(roleId),
                    mnu_id: menuId,
                    dtm_status: 1,
                    dtm_creadate: now,
                    dtm_creaby: userFullname,
                })),
            });
        });
    },
};

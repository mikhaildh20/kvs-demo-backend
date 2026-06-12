import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status }) => {
  const where = {};

  if (Keyword) {
    where.grm_name = {
      contains: Keyword,
    };
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.grm_status = Number(Status);
  }

  return where;
};

const resolveSort = (sortValue = "grm_name ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    grm_name: "grm_name",
    Name: "grm_name",
  };
  const column = columnMap[rawColumn] || "grm_name";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
  return { [column]: direction };
};

export const GroupMenuModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_group_menu.findMany({
        where,
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_group_menu.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_group_menu.findUnique({
      where: { grm_id: Number(id) },
    }),

  create: (data, userFullname) =>
    prisma.mst_group_menu.create({
      data: {
        grm_name: data.name,
        grm_status: Number(data.status ?? 1),
        grm_creaby: userFullname,
      },
    }),

  update: (id, data, userFullname) =>
    prisma.mst_group_menu.update({
      where: { grm_id: Number(id) },
      data: {
        grm_name: data.name,
        grm_modidate: new Date(),
        grm_modiby: userFullname,
      },
    }),

  toggleStatus: async (id, userFullname) => {
    const row = await prisma.mst_group_menu.findUnique({
      where: { grm_id: Number(id) },
    });

    if (!row) {
      throw new Error("Group menu not found");
    }

    return prisma.mst_group_menu.update({
      where: { grm_id: Number(id) },
      data: {
        grm_status: row.grm_status === 1 ? 0 : 1,
        grm_modidate: new Date(),
        grm_modiby: userFullname,
      },
    });
  },

  findAllMenus: () =>
    prisma.mst_menus.findMany({
      orderBy: {
        mnu_name: "asc",
      },
    }),

  findAssignedMenuIds: async (groupId) => {
    const rows = await prisma.mst_menus.findMany({
      where: {
        grm_id: Number(groupId),
      },
      select: {
        mnu_id: true,
      },
    });

    return rows.map((item) => item.mnu_id);
  },

  assignMenus: async (groupId, menuIds, userFullname) => {
    const safeMenuIds = [...new Set(menuIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];

    return prisma.$transaction(async (tx) => {
      await tx.mst_menus.updateMany({
        where: { grm_id: Number(groupId) },
        data: {
          grm_id: null,
          mnu_modidate: new Date(),
          mnu_modiby: userFullname,
        },
      });

      if (safeMenuIds.length === 0) return { count: 0 };

      return tx.mst_menus.updateMany({
        where: {
          mnu_id: { in: safeMenuIds },
        },
        data: {
          grm_id: Number(groupId),
          mnu_modidate: new Date(),
          mnu_modiby: userFullname,
        },
      });
    });
  },
};

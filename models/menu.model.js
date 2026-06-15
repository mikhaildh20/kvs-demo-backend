import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status }) => {
  const where = {};

  if (Keyword) {
    where.OR = [
      { mnu_name: { contains: Keyword } },
      { mnu_path: { contains: Keyword } },
      { mnu_icon: { contains: Keyword } },
    ];
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.mnu_status = Number(Status);
  }

  return where;
};

const resolveSort = (sortValue = "mnu_name ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    mnu_name: "mnu_name",
    mnu_path: "mnu_path",
    mnu_icon: "mnu_icon",
    Name: "mnu_name",
    Path: "mnu_path",
    Icon: "mnu_icon",
  };
  const column = columnMap[rawColumn] || "mnu_name";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";

  return { [column]: direction };
};

const ensureAdministratorMenuAccess = async (tx, menuId, userFullname) => {
  const adminRole = await tx.mst_roles.findFirst({
    where: {
      rol_name: "Administrator",
      rol_status: 1,
    },
    select: {
      rol_id: true,
    },
  });

  if (!adminRole) {
    return;
  }

  await tx.detail_menu.upsert({
    where: {
      mnu_id_rol_id: {
        mnu_id: Number(menuId),
        rol_id: adminRole.rol_id,
      },
    },
    create: {
      mnu_id: Number(menuId),
      rol_id: adminRole.rol_id,
      dtm_status: 1,
      dtm_creaby: userFullname,
    },
    update: {
      dtm_status: 1,
      dtm_modidate: new Date(),
      dtm_modiby: userFullname,
    },
  });
};

export const MenuModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_menus.findMany({
        where,
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_menus.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_menus.findUnique({
      where: { mnu_id: Number(id) },
    }),

  create: (data, userFullname) =>
    prisma.$transaction(async (tx) => {
      const menu = await tx.mst_menus.create({
        data: {
          mnu_name: data.name,
          mnu_path: data.path,
          mnu_icon: data.icon,
          mnu_status: 1,
          mnu_creaby: userFullname,
        },
      });

      await ensureAdministratorMenuAccess(tx, menu.mnu_id, userFullname);

      return menu;
    }),

  update: (id, data, userFullname) => {
    const updateData = {
      mnu_name: data.name,
      mnu_path: data.path,
      mnu_icon: data.icon,
      mnu_modidate: new Date(),
      mnu_modiby: userFullname,
    };

    if (data.status !== undefined && data.status !== null && data.status !== "") {
      updateData.mnu_status = Number(data.status);
    }

    return prisma.mst_menus.update({
      where: { mnu_id: Number(id) },
      data: updateData,
    });
  },

  toggleStatus: async (id, userFullname) => {
    const menu = await prisma.mst_menus.findUnique({
      where: { mnu_id: Number(id) },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    return prisma.$transaction(async (tx) => {
      const updatedMenu = await tx.mst_menus.update({
        where: { mnu_id: Number(id) },
        data: {
          mnu_status: menu.mnu_status === 1 ? 0 : 1,
          mnu_modidate: new Date(),
          mnu_modiby: userFullname,
        },
      });

      if (updatedMenu.mnu_status === 1) {
        await ensureAdministratorMenuAccess(tx, updatedMenu.mnu_id, userFullname);
      }

      return updatedMenu;
    });
  },
};

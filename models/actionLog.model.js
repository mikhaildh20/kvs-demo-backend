import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Action, MenuId }) => {
  const where = {};

  if (Keyword) {
    where.OR = [
      { acl_action: { contains: Keyword } },
      { acl_old: { contains: Keyword } },
      { acl_new: { contains: Keyword } },
      { acl_creaby: { contains: Keyword } },
      { mst_menus: { is: { mnu_name: { contains: Keyword } } } },
      { mst_menus: { is: { mnu_path: { contains: Keyword } } } },
    ];
  }

  if (Action) {
    where.acl_action = String(Action);
  }

  if (MenuId) {
    where.mnu_id = Number(MenuId);
  }

  return where;
};

const resolveSort = (sortValue = "acl_creadate DESC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    acl_creadate: "acl_creadate",
    acl_action: "acl_action",
    acl_creaby: "acl_creaby",
    CreatedDate: "acl_creadate",
    Action: "acl_action",
    CreatedBy: "acl_creaby",
  };
  const column = columnMap[rawColumn] || "acl_creadate";
  const direction = String(rawDirection || "DESC").toLowerCase() === "asc" ? "asc" : "desc";

  return { [column]: direction };
};

const normalizePathForCompare = (value = "") =>
  String(value || "").replace(/\/+$/, "") || "/";

export const ActionLogModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.txn_action_logs.findMany({
        where,
        include: {
          mst_menus: true,
        },
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.txn_action_logs.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.txn_action_logs.findUnique({
      where: {
        acl_id: Number(id),
      },
      include: {
        mst_menus: true,
      },
    }),

  async findMenuByPath(path) {
    const menus = await prisma.mst_menus.findMany({
      where: {
        mnu_status: 1,
      },
    });

    const normalizedPath = normalizePathForCompare(path);
    return menus.find((menu) => normalizePathForCompare(menu.mnu_path) === normalizedPath) || null;
  },

  create: (data, userFullname) =>
    prisma.txn_action_logs.create({
      data: {
        mnu_id: data.menuId,
        acl_action: data.action,
        acl_old: data.oldValue,
        acl_new: data.newValue,
        acl_creaby: userFullname,
      },
      include: {
        mst_menus: true,
      },
    }),
};

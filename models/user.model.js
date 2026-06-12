import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status, ExcludeId }) => {
  const where = {
    rol_id: { not: 1 },
  };

  if (Keyword) {
    where.OR = [
      { usr_fullname: { contains: Keyword } },
      { usr_username: { contains: Keyword } },
    ];
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.usr_status = Number(Status);
  }

  if (ExcludeId !== undefined && ExcludeId !== null && ExcludeId !== "") {
    where.usr_id = { not: Number(ExcludeId) };
  }

  return where;
};

const resolveSort = (sortValue = "usr_fullname ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    usr_fullname: "usr_fullname",
    usr_username: "usr_username",
    usr_creadate: "usr_creadate",
    Fullname: "usr_fullname",
    Username: "usr_username",
    Creadate: "usr_creadate",
  };

  const column = columnMap[rawColumn] || "usr_fullname";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
  return { [column]: direction };
};

export const UserModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_users.findMany({
        where,
        include: { mst_roles: true },
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_users.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_users.findUnique({
      where: { usr_id: Number(id) },
      include: { mst_roles: true },
    }),

  findByUsername: (username) =>
    prisma.mst_users.findFirst({
      where: { usr_username: String(username || "") },
      include: { mst_roles: true },
    }),

  create: (data) => prisma.mst_users.create({ data, include: { mst_roles: true } }),

  update: (id, data) => prisma.mst_users.update({ where: { usr_id: Number(id) }, data, include: { mst_roles: true } }),

  getRoleOptions: () =>
    prisma.mst_roles.findMany({
      where: {
        rol_status: 1,
        rol_id: { not: 1 },
      },
      orderBy: { rol_name: "asc" },
      select: { rol_id: true, rol_name: true },
    }),
};

import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status }) => {
  const where = {};

  if (Keyword) {
    where.lin_code = {
      contains: Keyword,
    };
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.lin_status = Number(Status);
  }

  return where;
};

const resolveSort = (sortValue = "lin_code ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    lin_code: "lin_code",
    Code: "lin_code",
  };
  const column = columnMap[rawColumn] || "lin_code";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";

  return { [column]: direction };
};

export const LineModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_lines.findMany({
        where,
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_lines.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_lines.findUnique({
      where: { lin_id: Number(id) },
    }),

  create: (data, userFullname) =>
    prisma.mst_lines.create({
      data: {
        lin_code: data.code,
        lin_status: Number(data.status ?? 1),
        lin_creaby: userFullname,
      },
    }),

  update: (id, data, userFullname) => {
    const updateData = {
      lin_code: data.code,
      lin_modidate: new Date(),
      lin_modiby: userFullname,
    };

    if (data.status !== undefined && data.status !== null && data.status !== "") {
      updateData.lin_status = Number(data.status);
    }

    return prisma.mst_lines.update({
      where: { lin_id: Number(id) },
      data: updateData,
    });
  },

  delete: (id, userFullname) =>
    prisma.mst_lines.update({
      where: { lin_id: Number(id) },
      data: {
        lin_status: 0,
        lin_modidate: new Date(),
        lin_modiby: userFullname,
      },
    }),

  toggleStatus: async (id, userFullname) => {
    const line = await prisma.mst_lines.findUnique({
      where: { lin_id: Number(id) },
    });

    if (!line) {
      throw new Error("Line not found");
    }

    return prisma.mst_lines.update({
      where: { lin_id: Number(id) },
      data: {
        lin_status: line.lin_status === 1 ? 0 : 1,
        lin_modidate: new Date(),
        lin_modiby: userFullname,
      },
    });
  },

  findAvailableUsersByLine: (lineId) =>
    prisma.mst_users.findMany({
      where: {
        usr_status: 1,
        OR: [
          {
            detail_line: {
              none: {
                dle_status: 1,
              },
            },
          },
          {
            detail_line: {
              some: {
                lin_id: Number(lineId),
                dle_status: 1,
              },
            },
          },
        ],
      },
      orderBy: {
        usr_fullname: "asc",
      },
    }),

  findAssignedUserIds: async (lineId) => {
    const rows = await prisma.detail_line.findMany({
      where: {
        lin_id: Number(lineId),
        dle_status: 1,
      },
      select: {
        usr_id: true,
      },
    });

    return rows.map((item) => item.usr_id);
  },

  assignUsers: async (lineId, userIds, userFullname) => {
    const safeUserIds = [...new Set(userIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.detail_line.deleteMany({
        where: {
          lin_id: Number(lineId),
        },
      });

      if (safeUserIds.length === 0) {
        return { count: 0 };
      }

      return tx.detail_line.createMany({
        data: safeUserIds.map((usrId) => ({
          usr_id: usrId,
          lin_id: Number(lineId),
          dle_status: 1,
          dle_creadate: now,
          dle_creaby: userFullname,
        })),
      });
    });
  },
};

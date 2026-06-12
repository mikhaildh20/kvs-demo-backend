import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status }) => {
  const where = {};

  if (Keyword) {
    where.qfm_name = {
      contains: Keyword,
    };
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.qfm_status = Number(Status);
  }

  return where;
};

const resolveSort = (sortValue = "qfm_name ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    qfm_name: "qfm_name",
    qfm_seq_length: "qfm_seq_length",
    Name: "qfm_name",
    SeqLength: "qfm_seq_length",
  };

  const column = columnMap[rawColumn] || "qfm_name";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
  return { [column]: direction };
};

export const QrFormatModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_qr_formats.findMany({
        where,
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_qr_formats.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_qr_formats.findUnique({
      where: { qfm_id: Number(id) },
    }),

  create: (data, userFullname) =>
    prisma.mst_qr_formats.create({
      data: {
        qfm_name: data.name,
        qfm_pattern: data.pattern,
        qfm_seq_length: Number(data.seqLength ?? 4),
        qfm_status: Number(data.status ?? 1),
        qfm_creaby: userFullname,
      },
    }),

  update: (id, data, userFullname) =>
    prisma.mst_qr_formats.update({
      where: { qfm_id: Number(id) },
      data: {
        qfm_name: data.name,
        qfm_pattern: data.pattern,
        qfm_seq_length: Number(data.seqLength ?? 4),
        qfm_modidate: new Date(),
        qfm_modiby: userFullname,
      },
    }),

  toggleStatus: async (id, userFullname) => {
    const qr = await prisma.mst_qr_formats.findUnique({
      where: { qfm_id: Number(id) },
    });

    if (!qr) {
      throw new Error("QR format not found");
    }

    return prisma.mst_qr_formats.update({
      where: { qfm_id: Number(id) },
      data: {
        qfm_status: qr.qfm_status === 1 ? 0 : 1,
        qfm_modidate: new Date(),
        qfm_modiby: userFullname,
      },
    });
  },

  findAssignableCustomers: (qrFormatId) =>
    prisma.mst_customers.findMany({
      where: {
        OR: [
          { qfm_id: null },
          { qfm_id: Number(qrFormatId) },
        ],
      },
      orderBy: {
        cst_code: "asc",
      },
    }),

  assignCustomers: async (qrFormatId, customerIds, userFullname) => {
    const safeCustomerIds = [...new Set(customerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

    return prisma.$transaction(async (tx) => {
      const clearResult = await tx.mst_customers.updateMany({
        where: {
          qfm_id: Number(qrFormatId),
          ...(safeCustomerIds.length > 0 ? { cst_id: { notIn: safeCustomerIds } } : {}),
        },
        data: {
          qfm_id: null,
          cst_modidate: new Date(),
          cst_modiby: userFullname,
        },
      });

      let assignResult = { count: 0 };
      if (safeCustomerIds.length > 0) {
        assignResult = await tx.mst_customers.updateMany({
          where: {
            cst_id: {
              in: safeCustomerIds,
            },
            OR: [
              { qfm_id: null },
              { qfm_id: Number(qrFormatId) },
            ],
          },
          data: {
            qfm_id: Number(qrFormatId),
            cst_modidate: new Date(),
            cst_modiby: userFullname,
          },
        });
      }

      return {
        assigned: assignResult.count,
        unassigned: clearResult.count,
      };
    });
  },
};

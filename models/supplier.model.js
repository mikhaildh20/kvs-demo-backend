import prisma from "./prisma.js";

const buildWhere = ({ Keyword, Status }) => {
  const where = {};

  if (Keyword) {
    where.spl_code = {
      contains: Keyword,
    };
  }

  if (Status !== undefined && Status !== null && Status !== "") {
    where.spl_status = Number(Status);
  }

  return where;
};

const resolveSort = (sortValue = "spl_code ASC") => {
  const [rawColumn, rawDirection] = String(sortValue).trim().split(/\s+/);
  const columnMap = {
    spl_code: "spl_code",
    Code: "spl_code",
  };

  const column = columnMap[rawColumn] || "spl_code";
  const direction = String(rawDirection || "ASC").toLowerCase() === "desc" ? "desc" : "asc";
  return { [column]: direction };
};

export const SupplierModel = {
  async findPaged(query) {
    const pageNumber = Math.max(Number(query.PageNumber || 1), 1);
    const pageSize = Math.max(Number(query.PageSize || 10), 1);
    const where = buildWhere(query);

    const [data, totalData] = await Promise.all([
      prisma.mst_suppliers.findMany({
        where,
        orderBy: resolveSort(query.Urut),
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mst_suppliers.count({ where }),
    ]);

    return { data, totalData };
  },

  findById: (id) =>
    prisma.mst_suppliers.findUnique({
      where: { spl_id: Number(id) },
    }),

  create: (data, userFullname) =>
    prisma.mst_suppliers.create({
      data: {
        spl_code: data.code,
        spl_status: Number(data.status ?? 1),
        spl_creaby: userFullname,
      },
    }),

  update: (id, data, userFullname) =>
    prisma.mst_suppliers.update({
      where: { spl_id: Number(id) },
      data: {
        spl_code: data.code,
        spl_modidate: new Date(),
        spl_modiby: userFullname,
      },
    }),

  toggleStatus: async (id, userFullname) => {
    const supplier = await prisma.mst_suppliers.findUnique({
      where: { spl_id: Number(id) },
    });

    if (!supplier) {
      throw new Error("Supplier not found");
    }

    return prisma.mst_suppliers.update({
      where: { spl_id: Number(id) },
      data: {
        spl_status: supplier.spl_status === 1 ? 0 : 1,
        spl_modidate: new Date(),
        spl_modiby: userFullname,
      },
    });
  },

  findAssignableCustomers: (supplierId) =>
    prisma.mst_customers.findMany({
      where: {
        OR: [
          { spl_id: null },
          { spl_id: Number(supplierId) },
        ],
      },
      orderBy: {
        cst_code: "asc",
      },
    }),

  assignCustomers: async (supplierId, customerIds, userFullname) => {
    const safeCustomerIds = [...new Set(customerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];

    return prisma.$transaction(async (tx) => {
      const clearResult = await tx.mst_customers.updateMany({
        where: {
          spl_id: Number(supplierId),
          ...(safeCustomerIds.length > 0 ? { cst_id: { notIn: safeCustomerIds } } : {}),
        },
        data: {
          spl_id: null,
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
              { spl_id: null },
              { spl_id: Number(supplierId) },
            ],
          },
          data: {
            spl_id: Number(supplierId),
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

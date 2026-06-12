import prisma from "./prisma.js";

export const MatrixModel = {
    findAll: () => prisma.mst_matrix.findMany(),

    findDateCode: (date) =>
        prisma.mst_matrix.findFirst({
            where: {
                mtx_actual_date:
                    String(date),
            },
        }),

    findMonthCode: (month) =>
        prisma.mst_matrix.findFirst({
            where: {
                mtx_actual_month:
                    String(month),
            },
        }),

    findYearCode: (year) =>
        prisma.mst_matrix.findFirst({
            where: {
                mtx_actual_year:
                    String(year),
            },
        }),
};
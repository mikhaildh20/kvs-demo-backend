import { MatrixModel } from "../models/matrix.model.js";

const mapMatrix = (matrix) => ({
  Id: matrix.mtx_id,
  ActualDate: matrix.mtx_actual_date,
  Date: matrix.mtx_date,
  ActualMonth: matrix.mtx_actual_month,
  Month: matrix.mtx_month,
  ActualYear: matrix.mtx_actual_year,
  Year: matrix.mtx_year,
});

export const MatrixService = {
    getAll: () => MatrixModel.findAll(),

    async generateLot() {

        const now = new Date();

        const actualDate =
            now.getDate();

        const actualMonth =
            now.getMonth() + 1;

        const actualYear =
            now.getFullYear();

        // 🔥 FIND MATRIX
        const dateMatrix =
            await MatrixModel.findDateCode(
                actualDate
            );

        const monthMatrix =
            await MatrixModel.findMonthCode(
                actualMonth
            );

        const yearMatrix =
            await MatrixModel.findYearCode(
                actualYear
            );

        if (
            !dateMatrix ||
            !monthMatrix ||
            !yearMatrix
        ) {
            throw new Error(
                "Matrix code not found"
            );
        }

        // 🔥 LOT GENERATION
        const lot = [
            yearMatrix.mtx_year,
            monthMatrix.mtx_month,
            dateMatrix.mtx_date,
        ]
        .map(v => String(v || "").trim())
        .join("");

        return {
            ActualDate:
                now.toISOString(),

            Lot: lot,

            Matrix: {
                Date:
                    mapMatrix(dateMatrix),

                Month:
                    mapMatrix(monthMatrix),

                Year:
                    mapMatrix(yearMatrix),
            },
        };
    },
};
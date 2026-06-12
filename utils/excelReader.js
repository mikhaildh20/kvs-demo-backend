import ExcelJS from "exceljs";

const cellToValue = (cell) => {
    const value = cell?.value;

    if (value && typeof value === "object" && !(value instanceof Date)) {
        if (Object.prototype.hasOwnProperty.call(value, "result")) return value.result;
        if (Object.prototype.hasOwnProperty.call(value, "text")) return value.text;
        if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || "").join("");
    }

    return value ?? "";
};

export const excelSerialDateToDate = (value) => {
    if (typeof value !== "number") return null;
    // Excel serial dates start at 1899-12-30, including Excel's leap-year quirk.
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const date = new Date(utcValue * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const readFirstWorksheetAsObjects = async (filePath, { defval = "" } = {}) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        const header = String(cellToValue(cell) || "").trim();
        headers[columnNumber - 1] = header;
    });

    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const item = {};
        let hasValue = false;

        headers.forEach((header, index) => {
            if (!header) return;
            const value = cellToValue(row.getCell(index + 1));
            const normalizedValue = value === undefined || value === null || value === "" ? defval : value;
            if (normalizedValue !== defval) hasValue = true;
            item[header] = normalizedValue;
        });

        if (hasValue || Object.keys(item).length > 0) {
            rows.push(item);
        }
    });

    return rows;
};

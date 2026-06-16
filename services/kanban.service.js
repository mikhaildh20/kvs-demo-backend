import { excelSerialDateToDate, readFirstWorksheetAsObjects } from "../utils/excelReader.js";
import {  
    bulkInsertKanban,
    bulkInsertDetail,
    KanbanModel
    } from '../models/kanban.model.js';

import { findCustomersByCodes, bulkInsertCustomer } from '../models/customer.model.js';
import { decryptIdUrl } from '../utils/encryptor.js';

const REQUIRED_FILE_A_COLUMNS = [
    "I_UPD_DATE",
    "I_ITEM_CD",
    "I_DL_CD",
    "I_DL_ARG_DESC",
    "I_TRADE_ITEM_CD",
    "I_TRADE_ITEM_DESC",
];

const REQUIRED_FILE_B_COLUMNS = [
    "I_ITEM_CD",
    "I_DRW_NO",
];

const resolveId = (value) => {
    const decrypted = decryptIdUrl(value);
    const id = String(decrypted || value || "").trim();

    if(!id){
        throw new Error("Invalid kanban number");
    }

    return id;
}

const normalizeColumn = (value) =>
    String(value || "")
        .trim()
        .toUpperCase();

const getMissingColumns = (headers, requiredColumns) => {
    const columns = new Set(headers);

    return requiredColumns.filter((column) => !columns.has(column));
};

const getCell = (row, column) => {
    const foundKey = Object.keys(row || {}).find((key) => normalizeColumn(key) === column);
    return foundKey ? row[foundKey] : null;
};

const normalizeRowKeys = (rows) =>
    (rows || []).map((row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row || {})) {
            normalized[normalizeColumn(key)] = value;
        }
        return normalized;
    });

const validateImportColumns = (rows, requiredColumns, fileLabel) => {
    const headers = Object.keys(rows?.[0] || {}).map(normalizeColumn);
    const missingColumns = getMissingColumns(headers, requiredColumns);

    if (missingColumns.length > 0) {
        throw new Error(
            `${fileLabel} is missing required column(s): ${missingColumns.join(", ")}.`
        );
    }
};

const normalizeKanbanNo = (value) => {
    const raw = String(value || "0000").trim();
    const normalized = raw.includes(".") ? raw.split(".")[0] : raw;
    return normalized.padStart(4, "0").slice(0, 5);
};

const buildOqcBarcode = (kanbanNo) => {
    const fourDigitKanban = String(kanbanNo || "").trim().padStart(4, "0").slice(-4);
    return `D${fourDigitKanban}0000002T`;
};

export const normalizeDate = (date) => {
    if (!date) return null;

    const d = new Date(date);

    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );
};

const parseExcelDate = (value) => {
    if(!value){
        return null;
    }

    if(typeof value === "number"){
        const parsed = excelSerialDateToDate(value);
        if(parsed){
            return parsed;
        }
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeKey = (val) =>
    String(val || "")
        .replace(/\s+/g, "")
        .trim()
        .toUpperCase();

const assertMaxLength = (value, maxLength, label) => {
    if (String(value || "").length > maxLength) {
        throw new Error(`${label} must be ${maxLength} characters or fewer.`);
    }
};

const mapKanban = (kanban) => ({
    Id: kanban.kbn_no,
    CustomerId: kanban.cst_id,
    CustomerCode: kanban.mst_customers?.cst_code || "-",
    CustomerName: kanban.mst_customers?.cst_name || "-",
    ColorId: kanban.clr_id,
    ColorName: kanban.mst_colors?.clr_name || "-",
    UniqNo: kanban.kbn_uniq_no || "-",
    QtyBox: Number(kanban.kbn_qty_box) || 0,
    Special: kanban.kbn_isSpecial,
    Status: kanban.kbn_status,
    SequenceCheckDesc: kanban.kbn_sequence_check_desc || "",
    LogisticGuideDesc: kanban.kbn_logistic_guide_desc || "",
    InstructionWorkPath: kanban.kbn_instruction_work_path || "",
    SequenceCheckPath: kanban.kbn_sequence_check_path || "",
    LogisticGuidePath: kanban.kbn_logistic_guide_path || "",
    SequenceCheckVoicePath: kanban.kbn_sequence_check_voice_path || "",
    LogisticGuideVoicePath: kanban.kbn_logistic_guide_voice_path || "",
    Stamp: kanban.kbn_stamp || "",
    DeviceNo: kanban.kbn_device_no || "",
    CertMark: kanban.kbn_cert_mark || "",
    OqcBarcode: kanban.kbn_oqc_barcode || "",
    Remark: kanban.kbn_remark || "",
    Details: (kanban.detail_kanban_part_number || []).map((detail) => ({
        Code: detail.pnu_code,
        KanbanNo: detail.kbn_no,
        LatestDate: detail.pnu_latest_date,
        Status: detail.pnu_status,
        CreatedAt: detail.pnu_creadate,
        CreatedBy: detail.pnu_creaby,
        ModifiedAt: detail.pnu_modidate,
        ModifiedBy: detail.pnu_modiby,
    })),
});

export const KanbanService = {
    async processKanbanImport(fileA, fileB) {
        if (!fileA || !fileB) {
            throw new Error(
                "Excel A and Excel B are required"
            );
        }

        // 🔥 READ FILE
        const sheetARaw = await readFirstWorksheetAsObjects(fileA.path, { defval: null });
        const sheetBRaw = await readFirstWorksheetAsObjects(fileB.path, { defval: null });

        const sheetA = normalizeRowKeys(sheetARaw);
        const sheetB = normalizeRowKeys(sheetBRaw);

        validateImportColumns(sheetA, REQUIRED_FILE_A_COLUMNS, "Excel A");
        validateImportColumns(sheetB, REQUIRED_FILE_B_COLUMNS, "Excel B");

        // 🔥 MAP ITEM MASTER
        const mapB = new Map();

        for (const row of sheetB) {
            const itemCode = normalizeKey(row.I_ITEM_CD);

            if (itemCode && !mapB.has(itemCode)) {
                mapB.set(itemCode, row);
            }
        }

        const rawKanbanMap = new Map();
        const customerMap = new Map();
        const detailMap = new Map();

        // 🔥 BUILD RAW DATA
        for (const rowA of sheetA) {
            const itemCode = normalizeKey(rowA.I_ITEM_CD);

            if (!itemCode) continue;

            const rowB = mapB.get(itemCode);

            if (!rowB) continue;

            // 🔥 CUSTOMER
            const customerCode = normalizeKey(rowA.I_DL_CD);

            const customerName = String(
                rowA.I_DL_ARG_DESC || ""
            )
            .trim()
            .toUpperCase();

            assertMaxLength(customerCode, 4, "Customer code");
            assertMaxLength(customerName, 55, "Customer name");

            if (customerCode) {
                customerMap.set(customerCode, {
                    cst_code: customerCode,
                    cst_name: customerName,
                });
            }

            // 🔥 KANBAN
            const kbn_no = normalizeKanbanNo(rowB.I_DRW_NO);

            if (!kbn_no) continue;

            if (!rawKanbanMap.has(kbn_no)) {
                rawKanbanMap.set(kbn_no, {
                    kbn_no,
                    cst_code: customerCode,
                });
            }

            // 🔥 DATE
            const latestDate = parseExcelDate(rowA.I_UPD_DATE);

            if (!latestDate) continue;

            const normalizedDate =
                normalizeDate(latestDate);

            if (!normalizedDate) continue;

            // 🔥 DETAIL KEY
            const detailKey = [
                itemCode,
                kbn_no,
                normalizedDate.getFullYear(),
                normalizedDate.getMonth(),
                normalizedDate.getDate(),
            ].join("_");

            // 🔥 PART INFO
            const partNumber = String(
                rowA.I_TRADE_ITEM_CD || ""
            )
            .trim()
            .toUpperCase();

            const partDesc = String(
                rowA.I_TRADE_ITEM_DESC || ""
            )
            .trim()
            .toUpperCase();

            assertMaxLength(itemCode, 50, "Item code");
            assertMaxLength(partNumber, 55, "Part number");
            assertMaxLength(partDesc, 55, "Part description");

            // 🔥 DETAIL
            detailMap.set(detailKey, {
                pnu_code: itemCode, 
                kbn_no,
                pnu_part_number: partNumber,
                pnu_part_desc: partDesc,
                pnu_latest_date: normalizedDate,
                pnu_status: 1,
                pnu_creaby: "PRONES",
            });
        }

        // 🔥 CUSTOMER DATA
        const customerData = Array.from(
            customerMap.values()
        );

        // 🔥 INSERT CUSTOMER
        await bulkInsertCustomer(
            customerData
        );

        // 🔥 GET CUSTOMER FROM DB
        const customers =
            await findCustomersByCodes(
                customerData.map(
                    (c) => c.cst_code
                )
            );

        // 🔥 CUSTOMER LOOKUP
        const customerLookup =
            new Map(
                customers.map((c) => [
                    c.cst_code,
                    c,
                ])
            );

        // 🔥 BUILD FINAL KANBAN
        const kanbanData = Array.from(
            rawKanbanMap.values()
        ).map((row) => {

            const customer =
                customerLookup.get(
                    row.cst_code
                );

            return {
                kbn_no: row.kbn_no,
                cst_id:
                    customer?.cst_id || null,
                kbn_device_no: "000",
                kbn_cert_mark: "000",
                kbn_oqc_barcode: buildOqcBarcode(row.kbn_no),
                kbn_status: 1,
                kbn_creaby: "PRONES",
            };
        });

        // 🔥 DETAIL DATA
        const detailData = Array.from(
            detailMap.values()
        );

        if (detailData.length === 0) {
            throw new Error(
                "No matching data was found between Excel A and Excel B"
            );
        }

        // 🔥 INSERT MASTER
        const kanbanResult = await bulkInsertKanban(
            kanbanData
        );

        // 🔥 INSERT DETAIL
        const detailResult = await bulkInsertDetail(
            detailData
        );

        const changedRows =
            Number(kanbanResult?.created || 0) +
            Number(detailResult?.created || 0) +
            Number(detailResult?.updated || 0);

        return {
            total: detailData.length,
            kanban: kanbanData.length,
            customer: customerData.length,
            inserted: Number(detailResult?.created || 0),
            updated: Number(detailResult?.updated || 0),
            unchanged: Number(detailResult?.unchanged || 0),
            createdKanban: Number(kanbanResult?.created || 0),
            skippedKanban: Number(kanbanResult?.skipped || 0),
            changed: changedRows,
            noChanges: changedRows === 0,
        };
    },

    async getAll(query){
        const result = await KanbanModel.findPaged(query);
        return {
            data: result.data.map(mapKanban),
            totalData: result.totalData,
        };
    },

    async getById(rawId){
        const kanban = await KanbanModel.findById(resolveId(rawId));

        if(!kanban){
            throw new Error("Kanban not found");
        }

        return mapKanban(kanban);
    },

    async create(payload, userId){
        if(!payload.no?.trim()){
            throw new Error("Kanban number is required");
        }

        return mapKanban(await KanbanModel.create(payload, userId));
    },

    async update(rawId, payload, userId){
        return mapKanban(await KanbanModel.update(resolveId(rawId), payload, userId));
    },

    async toggleStatus(rawId, userId){
        return mapKanban(await KanbanModel.toggleStatus(resolveId(rawId), userId));
    },

    async toggleSpecial(rawId, userId){
        return mapKanban(await KanbanModel.toggleSpecial(resolveId(rawId), userId));
    },

    async getDropdownList() {

        const data =
            await KanbanModel.findDropdownList();

        return data.map((item) => ({
            No: item.kbn_no,
            QtyBox: item.kbn_qty_box || 0,
            CustomerName:
                item.mst_customers?.cst_name || "-",
            ColorName:
                item.mst_colors?.clr_name || "-",
            IsSpecial: item.kbn_isSpecial === 1 ? 1 : 0,
        }));
    },

    async getDropdownListPartNumber(id){
        const data = await KanbanModel.findDropdownListPartNumber(id);

        return data.map((item) => ({
            PartNumber: item.pnu_part_number,
            PartDesc: item.pnu_part_desc,
            LatestDate: item.pnu_latest_date,
        }));
    }
};

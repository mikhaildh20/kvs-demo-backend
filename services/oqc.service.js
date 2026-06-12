import { OQCModel } from "../models/oqc.model.js";
import { decryptIdUrl } from "../utils/encryptor.js";
import { validateQrPattern } from "../utils/qrFormatValidator.js";
import { renderQrPatternBackend } from "../utils/qrEngine.js";

const resolveId = (value) => {
  const decrypted = decryptIdUrl(value);
  const id = Number(decrypted || value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid oqc id");
  }

  return id;
};

const mapOQC = (OQC, seqStart = null) => {
  const totalLabel = Number(OQC.oqc_total_label || 0);
  const start = Number(seqStart || 1);
  const end = totalLabel > 0 ? start + totalLabel - 1 : start;

  return {
  Id: OQC.oqc_id,
  No: OQC.kbn_no,
  LotNo: OQC.oqc_lot_no,
  QtyBox: OQC.oqc_qty_box,
  QtyPlan: OQC.oqc_qty_plan,
  TotalLabel: OQC.oqc_total_label,
  TotalA4: OQC.oqc_total_A4,
  Status: OQC.oqc_status,
  Creadate: OQC.oqc_creadate,
  SeqStart: start,
  SeqEnd: end,
  SeqRange: `${start}-${end}`,
  };
};

const formatLotDateQr = (date = new Date()) =>
  [
    new Date(date).getFullYear(),
    String(new Date(date).getMonth() + 1).padStart(2, "0"),
    String(new Date(date).getDate()).padStart(2, "0"),
  ].join("");

const formatLotDateDisplay = (date = new Date()) =>
  new Date(date)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .replace(/ /g, "-");

const buildPreviewData = ({
  kanban,
  lotNo,
  qtyPlan,
  selectedPartNumber,
  userFullname,
  seqStart = 1,
}) => {
  const customer = kanban.mst_customers;
  const qrFormat = customer?.mst_qr_formats;
  const supplier = customer?.mst_suppliers;
  const details = kanban.detail_kanban_part_number || [];

  if (!customer) throw new Error("Customer on kanban not found");
  if (!qrFormat?.qfm_pattern) throw new Error("QR format for customer is not configured");

  validateQrPattern(qrFormat.qfm_pattern);

  let detailPart = null;
  if (kanban.kbn_isSpecial === 1 && selectedPartNumber) {
    detailPart = details.find((item) => String(item.pnu_part_number || "").trim() === selectedPartNumber);
  } else {
    detailPart = details[0] || null;
  }

  if (!detailPart && selectedPartNumber) {
    detailPart = details.find((item) => String(item.pnu_part_number || "").trim() === selectedPartNumber) || null;
  }

  if (!detailPart) throw new Error("Part number detail not found for selected kanban");

  const qtyBox = Number(kanban.kbn_qty_box || 0);
  if (!qtyBox || qtyBox <= 0) throw new Error("Qty/Box on kanban is invalid");

  const totalLabel = Math.ceil(qtyPlan / qtyBox);
  const totalA4 = Math.ceil(totalLabel / 16);
  const lotDateQr = formatLotDateQr(new Date());
  const lotDateDisplay = formatLotDateDisplay(new Date());
  const seqLength = Number(qrFormat.qfm_seq_length || 4);

  const labels = Array.from({ length: totalLabel }, (_, idx) => {
    const seq = Number(seqStart) + idx;
    const qrText = renderQrPatternBackend(
      qrFormat.qfm_pattern,
      {
        PART_NUMBER: detailPart.pnu_part_number || "",
        SUPPLIER: supplier?.spl_code || "",
        QTY: qtyBox,
        LOT_NO: lotNo,
        LOT_DATE: lotDateQr,
        KBN: kanban.kbn_no,
        SEQ: seq,
      },
      seqLength
    );

    return {
      seq,
      qrText,
      partName: detailPart.pnu_part_desc || "-",
      partNumber: detailPart.pnu_part_number || "-",
      lotNo,
      lotDate: lotDateDisplay,
      inspector: userFullname || "-",
      kanbanNo: kanban.kbn_no,
      jobNo: kanban.kbn_uniq_no ?? "",
      qty: qtyBox,
      judge: "KOITO",
    };
  });

  return {
    no: kanban.kbn_no,
    lotNo,
    qtyBox,
    qtyPlan,
    totalLabel,
    totalA4,
    isSpecial: kanban.kbn_isSpecial === 1,
    partNumber: detailPart.pnu_part_number || "",
    labels,
    seqStart: Number(seqStart),
  };
};

export const OQCService = {
  async getAll(query) {
    const result = await OQCModel.findPaged(query);
    const data = await Promise.all(
      result.data.map(async (row) => {
        const prevTotal = await OQCModel.sumTotalLabelByKanbanLotAndDate(
          row.kbn_no,
          row.oqc_lot_no,
          row.oqc_creadate || new Date(),
          row.oqc_id
        );
        return mapOQC(row, Number(prevTotal || 0) + 1);
      })
    );

    return {
      data,
      totalData: result.totalData,
    };
  },

  async getById(rawId) {
    const OQC = await OQCModel.findById(resolveId(rawId));

    if (!OQC) {
      throw new Error("OQC not found");
    }

    const prevTotal = await OQCModel.sumTotalLabelByKanbanLotAndDate(
      OQC.kbn_no,
      OQC.oqc_lot_no,
      OQC.oqc_creadate || new Date(),
      OQC.oqc_id
    );

    return mapOQC(OQC, Number(prevTotal || 0) + 1);
  },

  async previewLabels(payload, userFullname) {
    const kanbanNo = String(payload.no || "").trim();
    const lotNo = String(payload.lotNo || "").trim();
    const qtyPlan = Number(payload.qtyPlan || 0);
    const selectedPartNumber = String(payload.partNumber || "").trim();

    if (!kanbanNo) throw new Error("Kanban is required");
    if (!lotNo) throw new Error("LOT is required");
    if (!Number.isFinite(qtyPlan) || qtyPlan <= 0) throw new Error("Quantity must be greater than 0");

    const kanban = await OQCModel.findKanbanForPreview(kanbanNo);
    if (!kanban) throw new Error("Kanban not found");
    const previousTotalLabel = await OQCModel.sumTotalLabelByKanbanLotAndDate(
      kanbanNo,
      lotNo,
      new Date()
    );
    const seqStart = Number(previousTotalLabel || 0) + 1;

    return buildPreviewData({
      kanban,
      lotNo,
      qtyPlan,
      selectedPartNumber,
      userFullname,
      seqStart,
    });
  },

  async previewByOqcId(rawId, userFullname) {
    const oqc = await OQCModel.findById(resolveId(rawId));
    if (!oqc) throw new Error("OQC not found");

    const kanban = await OQCModel.findKanbanForPreview(oqc.kbn_no);
    if (!kanban) throw new Error("Kanban on OQC not found");
    const previousTotalLabel = await OQCModel.sumTotalLabelByKanbanLotAndDate(
      oqc.kbn_no,
      oqc.oqc_lot_no,
      oqc.oqc_creadate || new Date(),
      oqc.oqc_id
    );
    const seqStart = Number(previousTotalLabel || 0) + 1;

    return buildPreviewData({
      kanban,
      lotNo: oqc.oqc_lot_no,
      qtyPlan: Number(oqc.oqc_qty_plan || 0),
      selectedPartNumber: "",
      userFullname,
      seqStart,
    });
  },

  async create(payload, userId) {
    const created = await OQCModel.create(payload, userId);
    const prevTotal = await OQCModel.sumTotalLabelByKanbanLotAndDate(
      created.kbn_no,
      created.oqc_lot_no,
      created.oqc_creadate || new Date(),
      created.oqc_id
    );
    return mapOQC(created, Number(prevTotal || 0) + 1);
  },
};

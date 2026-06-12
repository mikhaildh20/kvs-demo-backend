const parseToken = (rawToken) => {
  const chunks = String(rawToken || "").split(":").map((item) => item.trim()).filter(Boolean);
  const token = (chunks[0] || "").toUpperCase();
  const modifiers = chunks.slice(1);

  return { token, modifiers };
};

const removeDash = (value) => String(value || "").replace(/-/g, "");
const toLower = (value) => String(value || "").toLowerCase();
const padValue = (value, width) => String(value || "").padStart(Number(width), "0");

const applyPartNumberModifiers = (value, modifiers) => {
  let result = String(value || "");

  for (const modifier of modifiers.map((item) => item.toUpperCase())) {
    if (modifier === "LOWER") result = toLower(result);
    if (modifier === "NODASH") result = removeDash(result);
  }

  return result;
};

const normalizeSeqLength = (value) => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : 4;
};

const resolveToken = ({ token, modifiers }, values, seqLength) => {
  switch (token) {
    case "PART_NUMBER":
      return applyPartNumberModifiers(values.PART_NUMBER, modifiers);

    case "SUPPLIER": {
      const base = String(values.SUPPLIER || "");
      if (modifiers.length === 0) return base;
      return padValue(base, modifiers[0]);
    }

    case "QTY": {
      const base = String(values.QTY || "");
      if (modifiers.length === 0) return base;
      return padValue(base, modifiers[0]);
    }

    case "LOT_NO":
      return String(values.LOT_NO || "");

    case "LOT_DATE":
      return String(values.LOT_DATE || "");

    case "KBN":
      return String(values.KBN || "");

    case "SEQ":
      return padValue(values.SEQ || "", normalizeSeqLength(seqLength));

    default:
      throw new Error(`Unknown placeholder: ${token}`);
  }
};

export const renderQrPatternBackend = (pattern, values = {}, seqLength = 4) =>
  String(pattern || "").replace(/\{([^{}]+)\}/g, (_, rawToken) => {
    const parsed = parseToken(rawToken);
    return resolveToken(parsed, values, seqLength);
  });

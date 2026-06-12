const ALLOWED_TOKENS = new Set([
  "PART_NUMBER",
  "SUPPLIER",
  "QTY",
  "LOT_NO",
  "LOT_DATE",
  "KBN",
  "SEQ",
]);

const parsePlaceholder = (rawToken) => {
  const chunks = String(rawToken || "").split(":").map((item) => item.trim()).filter(Boolean);
  const token = (chunks[0] || "").toUpperCase();
  const modifiers = chunks.slice(1);

  return { token, modifiers };
};

export const extractPlaceholders = (pattern = "") => {
  const matches = String(pattern).match(/\{[^{}]+\}/g) || [];
  return matches.map((item) => item.slice(1, -1).trim());
};

const validatePartNumberModifiers = (modifiers) => {
  for (const modifier of modifiers) {
    const upper = modifier.toUpperCase();
    if (upper !== "LOWER" && upper !== "NODASH") {
      throw new Error(`Unknown placeholder: PART_NUMBER:${modifier}`);
    }
  }
};

const validateNumericWidth = (token, modifiers) => {
  if (modifiers.length === 0) return;
  if (modifiers.length > 1 || !/^\d+$/.test(modifiers[0])) {
    throw new Error(`Unknown placeholder: ${token}:${modifiers.join(":")}`);
  }
};

export const validateQrPattern = (pattern = "") => {
  const placeholders = extractPlaceholders(pattern);

  for (const placeholder of placeholders) {
    const { token, modifiers } = parsePlaceholder(placeholder);

    if (!ALLOWED_TOKENS.has(token)) {
      throw new Error(`Unknown placeholder: ${placeholder}`);
    }

    if (token === "PART_NUMBER") {
      validatePartNumberModifiers(modifiers);
      continue;
    }

    if (token === "SUPPLIER" || token === "QTY") {
      validateNumericWidth(token, modifiers);
      continue;
    }

    if (modifiers.length > 0) {
      throw new Error(`Unknown placeholder: ${placeholder}`);
    }
  }

  return true;
};

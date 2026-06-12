const PAGE_PATH_BY_API_PREFIX = [
  { api: "/api/lines", page: "/pages/line" },
  { api: "/api/menus", page: "/pages/menu" },
  { api: "/api/matrix", page: "/pages/matrix" },
  { api: "/api/action-logs", page: "/pages/log" },
  { api: "/api/double-check", page: "/pages/double-check" },
  { api: "/api/barcode-delivery-scans", page: "/pages/barcode-delivery-scan" },
  { api: "/api/suppliers", page: "/pages/supplier" },
  { api: "/api/qr-formats", page: "/pages/qr-format" },
];

const trimSlashes = (value) => value.replace(/\/+$/, "") || "/";

const stripQuery = (value = "") => value.split("?")[0].split("#")[0];

const looksLikeDynamicId = (segment = "") => {
  if (/^\d+$/.test(segment)) return true;
  if (segment.length >= 12 && /^[A-Za-z0-9_-]+$/.test(segment)) return true;
  return false;
};

export const normalizePagePath = (rawPath = "") => {
  const cleanPath = trimSlashes(stripQuery(rawPath));
  const segments = cleanPath.split("/").filter(Boolean);

  if (segments.length <= 2) {
    return cleanPath;
  }

  const lastSegment = segments.at(-1);
  const previousSegment = segments.at(-2);
  const dynamicParents = new Set(["edit", "detail", "view", "print"]);

  if (dynamicParents.has(previousSegment) && looksLikeDynamicId(lastSegment)) {
    return `/${segments.slice(0, -1).join("/")}`;
  }

  return cleanPath;
};

export const resolvePagePathFromRequest = (req) => {
  const headerPath = req.get("x-page-path");

  if (headerPath?.startsWith("/pages/")) {
    return normalizePagePath(headerPath);
  }

  const apiPath = trimSlashes(req.baseUrl + req.path);
  const mapping = PAGE_PATH_BY_API_PREFIX.find((item) =>
    apiPath.startsWith(item.api)
  );

  return mapping ? mapping.page : normalizePagePath(apiPath);
};

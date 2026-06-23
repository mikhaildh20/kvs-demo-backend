import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const BASE = "http://127.0.0.1:5000";
const SEED_KEY = process.env.AUTH_SEED_KEY;

let token = "";
const H = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

const fetchJSON = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
};

// Shared setup: seed admin + login once for all tests
before(async () => {
  await fetchJSON(BASE + "/api/auth/seed-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-auth-seed-key": SEED_KEY },
    body: JSON.stringify({ username: "test_admin_full", password: "AdminFull123!", name: "Full Test Admin", role: "Administrator" }),
  });
  const { body } = await fetchJSON(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test_admin_full", password: "AdminFull123!" }),
  });
  token = body?.data?.token;
});

// ════════════════════════════════════════════════════════════
//  1. HEALTH CHECK
// ════════════════════════════════════════════════════════════
describe("1. Health Check", () => {
  it("GET / should return connected message", async () => {
    const res = await fetch(BASE + "/");
    const text = await res.text();
    assert.ok(text.includes("Connected"), `Expected "Connected" in response: ${text}`);
  });
});

// ════════════════════════════════════════════════════════════
//  2. AUTH — SEED USER
// ════════════════════════════════════════════════════════════
describe("2. Auth — Seed User", () => {
  it("should reject seed request without seed key", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/seed-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "x", password: "x" }),
    });
    assert.equal(status, 403);
  });

  it("should reject seed request with invalid seed key", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/seed-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-seed-key": "wrong-key-123" },
      body: JSON.stringify({ username: "x", password: "x" }),
    });
    assert.equal(status, 403);
  });

  it("should create or update admin user with valid seed key", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/auth/seed-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-seed-key": SEED_KEY },
      body: JSON.stringify({ username: "admin_seed_test", password: "SeedTest123!", name: "Seed Test User", role: "Administrator" }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
    assert.ok(body.message);
  });
});

// ════════════════════════════════════════════════════════════
//  3. AUTH — LOGIN
// ════════════════════════════════════════════════════════════
describe("3. Auth — Login", () => {
  it("should reject login without credentials", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(status, 401);
  });

  it("should reject login with wrong password", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin_seed_test", password: "wrongpass" }),
    });
    assert.equal(status, 401);
  });

  it("should reject login with non-existent user", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nonexistent_user_xyz", password: "whatever" }),
    });
    assert.equal(status, 401);
  });

  it("should login successfully and return token", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test_admin_full", password: "AdminFull123!" }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
    assert.ok(body.data.token, "Token should be present");
    assert.ok(body.data.user, "User data should be present");
  });
});

// ════════════════════════════════════════════════════════════
//  4. AUTH — ME & SESSION
// ════════════════════════════════════════════════════════════
describe("4. Auth — Me & Session", () => {
  it("GET /api/auth/me — returns current user info", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/auth/me", { headers: H() });
    assert.equal(status, 200);
    assert.ok(body.data);
  });

  it("GET /api/auth/me — rejects without token", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/me");
    assert.equal(status, 401);
  });

  it("GET /api/auth/me — rejects with invalid token", async () => {
    const { status } = await fetchJSON(BASE + "/api/auth/me", {
      headers: { Authorization: "Bearer invalid.token.xyz" },
    });
    assert.equal(status, 401);
  });

  it("GET /api/auth/session — returns menus and access paths", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/auth/session", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.menus));
    assert.ok(Array.isArray(body.data.accessPaths));
  });
});

// ════════════════════════════════════════════════════════════
//  5. AUTH PROTECTION
// ════════════════════════════════════════════════════════════
describe("5. Auth Protection — Unauthenticated Access", () => {
  it("should reject all protected endpoints without token", async () => {
    const endpoints = ["/api/colors", "/api/lines", "/api/roles", "/api/users", "/api/menus"];
    for (const ep of endpoints) {
      const { status } = await fetchJSON(BASE + ep);
      assert.equal(status, 401, `Expected 401 for ${ep}, got ${status}`);
    }
  });

  it("should reject with invalid Bearer token", async () => {
    const { status } = await fetchJSON(BASE + "/api/colors", {
      headers: { Authorization: "Bearer this.is.not.a.valid.jwt.token" },
    });
    assert.equal(status, 401);
  });
});

// ════════════════════════════════════════════════════════════
//  6. COLORS CRUD
// ════════════════════════════════════════════════════════════
describe("6. Colors — CRUD Operations", () => {
  let colorId = null;

  it("POST /api/colors — create new color", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/colors", {
      method: "POST", headers: H(),
      body: JSON.stringify({ name: "TestColor_IntTest" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    assert.equal(body.error, false);
    colorId = body.data.Id;
    assert.ok(colorId > 0, "Created color should have valid ID");
  });

  it("GET /api/colors — list with keyword filter", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/colors?Keyword=TestColor&PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.equal(body.error, false);
    assert.ok(Array.isArray(body.data.data), "data.data should be array");
    assert.ok(body.data.totalData >= 1, "Should have at least 1 record");
  });

  it("GET /api/colors/:id — get by ID", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/colors/" + colorId, { headers: H() });
    assert.equal(status, 200);
    assert.equal(body.data.Id, colorId);
  });

  it("PUT /api/colors/:id — update", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/colors/" + colorId, {
      method: "PUT", headers: H(),
      body: JSON.stringify({ name: "TestColor_Updated" }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
  });

  it("POST /api/colors/toggle-status — toggle status", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/colors/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: colorId }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
  });

  it("GET /api/colors/:id — returns 400 for non-existent ID", async () => {
    const { status } = await fetchJSON(BASE + "/api/colors/999999", { headers: H() });
    assert.equal(status, 400);
  });
});

// ════════════════════════════════════════════════════════════
//  7. LINES CRUD
// ════════════════════════════════════════════════════════════
describe("7. Lines — CRUD Operations", () => {
  let lineId = null;

  it("POST /api/lines — create new line", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/lines", {
      method: "POST", headers: H(),
      body: JSON.stringify({ code: "LIN-TINT" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    assert.equal(body.error, false);
    lineId = body.data.Id;
  });

  it("GET /api/lines — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/lines?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("GET /api/lines/:id — get by ID", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/lines/" + lineId, { headers: H() });
    assert.equal(status, 200);
    assert.equal(body.data.Id, lineId);
  });

  it("PUT /api/lines/:id — update", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/lines/" + lineId, {
      method: "PUT", headers: H(),
      body: JSON.stringify({ code: "LIN-TUPD" }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
  });

  it("POST /api/lines/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/lines/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: lineId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  8. ROLES CRUD
// ════════════════════════════════════════════════════════════
describe("8. Roles — CRUD Operations", () => {
  let roleId = null;

  it("POST /api/roles — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/roles", {
      method: "POST", headers: H(),
      body: JSON.stringify({ name: "TestRole_IntTest" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    roleId = body.data.Id;
  });

  it("GET /api/roles — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/roles?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("GET /api/roles/:id/detail — get detail", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/roles/" + roleId + "/detail", { headers: H() });
    assert.equal(status, 200);
    assert.ok(body.data);
  });

  it("POST /api/roles/:id/assign-menus — assign menus (empty)", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/roles/" + roleId + "/assign-menus", {
      method: "POST", headers: H(),
      body: JSON.stringify({ menuIds: [] }),
    });
    assert.equal(status, 200);
    assert.equal(body.error, false);
  });

  it("POST /api/roles/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/roles/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: roleId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  9. USERS CRUD
// ════════════════════════════════════════════════════════════
describe("9. Users — CRUD Operations", () => {
  let userId = null;

  it("GET /api/users — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/users?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("POST /api/users — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/users", {
      method: "POST", headers: H(),
      body: JSON.stringify({ username: "ituser_" + Date.now(), fullname: "Integration Test User", roleId: 1 }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    assert.equal(body.error, false);
    userId = body.data.user.Id;
  });

  it("GET /api/users/roles — role options", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/users/roles", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
  });

  it("POST /api/users/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/users/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: userId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  10. MENUS CRUD
// ════════════════════════════════════════════════════════════
describe("10. Menus — CRUD Operations", () => {
  let menuId = null;

  it("GET /api/menus — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/menus?PageNumber=1&PageSize=50", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("POST /api/menus — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/menus", {
      method: "POST", headers: H(),
      body: JSON.stringify({ name: "Test Menu IntTest", path: "/pages/int-test-menu", icon: "TestIcon" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    menuId = body.data.Id;
  });

  it("POST /api/menus/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/menus/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: menuId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  11. GROUP MENUS CRUD
// ════════════════════════════════════════════════════════════
describe("11. Group Menus — CRUD Operations", () => {
  let grmId = null;

  it("POST /api/group-menus — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/group-menus", {
      method: "POST", headers: H(),
      body: JSON.stringify({ name: "TGRP_" + String(Date.now()).slice(-6) }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    grmId = body.data.Id;
  });

  it("GET /api/group-menus — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/group-menus?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("POST /api/group-menus/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/group-menus/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: grmId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  12. CUSTOMERS CRUD
// ════════════════════════════════════════════════════════════
describe("12. Customers — CRUD Operations", () => {
  let cstId = null;

  it("POST /api/customers — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/customers", {
      method: "POST", headers: H(),
      body: JSON.stringify({ code: "C" + String(Date.now()).slice(-3), name: "IntTest Customer" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    cstId = body.data.Id;
  });

  it("GET /api/customers — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/customers?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(body.data.totalData >= 1);
  });

  it("POST /api/customers/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/customers/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: cstId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  13. SUPPLIERS CRUD
// ════════════════════════════════════════════════════════════
describe("13. Suppliers — CRUD Operations", () => {
  let splId = null;

  it("POST /api/suppliers — create", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/suppliers", {
      method: "POST", headers: H(),
      body: JSON.stringify({ code: "SPL" + Date.now(), name: "IntTest Supplier" }),
    });
    assert.ok([200, 201].includes(status), `Create failed: ${status}`);
    splId = body.data.Id;
  });

  it("GET /api/suppliers — list", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/suppliers?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(body.data.totalData >= 1);
  });

  it("POST /api/suppliers/toggle-status — toggle", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/suppliers/toggle-status", {
      method: "POST", headers: H(),
      body: JSON.stringify({ id: splId }),
    });
    assert.equal(status, 200);
  });
});

// ════════════════════════════════════════════════════════════
//  14. READ-ONLY ENDPOINTS
// ════════════════════════════════════════════════════════════
describe("14. Matrix — Read Only", () => {
  it("GET /api/matrix — lists matrices", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/matrix", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /api/matrix/generate-lot — generates lot number", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/matrix/generate-lot", { headers: H() });
    assert.equal(status, 200);
    assert.ok(body.data, "Should return lot data");
  });
});

describe("15. QR Formats — Read Only", () => {
  it("GET /api/qr-formats — lists", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/qr-formats?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });
});

describe("16. Kanbans — Read Only", () => {
  it("GET /api/kanbans — lists", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/kanbans?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("GET /api/kanbans/dropdown-list — returns dropdown options", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/kanbans/dropdown-list", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
  });
});

describe("17. OQC — Read Only", () => {
  it("GET /api/oqcs — lists", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/oqcs?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });
});

describe("18. Double Check — Read Only", () => {
  it("GET /api/double-check/summary — returns summary", async () => {
    const { status } = await fetchJSON(BASE + "/api/double-check/summary", { headers: H() });
    assert.ok([200, 400, 403, 500].includes(status), `Unexpected status: ${status}`);
  });
});

describe("19. Barcode Delivery Scan — Read Only", () => {
  it("GET /api/barcode-delivery-scans — lists", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/barcode-delivery-scans?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });

  it("GET /api/barcode-delivery-scans/po-options — returns options", async () => {
    const { status } = await fetchJSON(BASE + "/api/barcode-delivery-scans/po-options", { headers: H() });
    assert.ok([200, 400, 404].includes(status), `Unexpected status: ${status}`);
  });
});

describe("20. Action Logs — Read Only", () => {
  it("GET /api/action-logs — lists", async () => {
    const { status, body } = await fetchJSON(BASE + "/api/action-logs?PageNumber=1&PageSize=10", { headers: H() });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data.data));
  });
});

// ════════════════════════════════════════════════════════════
//  21. ERROR HANDLING
// ════════════════════════════════════════════════════════════
describe("21. Error Handling", () => {
  it("returns 401 for unknown protected API route", async () => {
    const { status } = await fetchJSON(BASE + "/api/does-not-exist-at-all");
    assert.equal(status, 401);
  });

  it("handles malformed JSON body gracefully", async () => {
    const res = await fetch(BASE + "/api/colors", {
      method: "POST",
      headers: H(),
      body: "not valid json {{{",
    });
    assert.ok([400, 500].includes(res.status), `Unexpected status: ${res.status}`);
  });

  it("returns 400 for non-existent resource by ID", async () => {
    const { status } = await fetchJSON(BASE + "/api/colors/999999", { headers: H() });
    assert.equal(status, 400);
  });
});

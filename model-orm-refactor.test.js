import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const modelDir = new URL("./models/", import.meta.url);
const rawQueryPatterns = [/\.\$queryRaw/, /\.\$queryRawUnsafe/, /\.\$executeRaw/, /\.\$executeRawUnsafe/];

describe("model data access", () => {
  it("uses Prisma ORM instead of raw SQL queries inside model files", () => {
    const offenders = [];

    for (const fileName of readdirSync(modelDir)) {
      if (!fileName.endsWith(".model.js")) continue;
      const source = readFileSync(join(modelDir.pathname, fileName), "utf8");
      if (rawQueryPatterns.some((pattern) => pattern.test(source))) {
        offenders.push(fileName);
      }
    }

    assert.deepEqual(offenders, []);
  });
});

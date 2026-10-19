import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { IMPORT_FUNCTION_SQL, httpImportPayload } from "./neon-http-writer";
import type { ImportCandidate } from "./import-store";

test("real HTTP transaction SQL refreshes changed public tools and guards concurrent approvals", async (t) => {
  const database = new PGlite();
  try {
    const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const migration of migrations) await database.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    await database.exec(`INSERT INTO "Category" (id,name,slug) VALUES ('category','Automation','automation')`);
    await database.exec(IMPORT_FUNCTION_SQL);
    const candidate: ImportCandidate = {
      name: "Public SQL fixture", url: "https://public-sql.example", description: "A tool", categoryHints: ["automation"],
      githubStars: 100,
      discovery: { source: "MANUAL", method: "fixture", sourceKey: "first-discovery", sourceUrl: "https://editor.example/tools" },
    };
    type Saved = { tool: { id: string; status: string; githubStars: number }; publicChanged: boolean; created: boolean };
    const save = async (stars = 100, allowPublicWrite = false, sourceKey = "first-discovery") => {
      const input = { ...candidate, githubStars: stars, discovery: { ...candidate.discovery, sourceKey } };
      const payload = httpImportPayload(input, ["url:public-sql.example"], [], [], "category", "public-sql-fixture", allowPublicWrite);
      return (await database.query<{ result: Saved }>("SELECT pg_temp.toools_import_candidate($1::jsonb) AS result", [JSON.stringify(payload)])).rows[0].result;
    };
    let id: string;
    await t.test("new PENDING candidates need no publication permission and do not request invalidation", async () => {
      const saved = await save();
      id = saved.tool.id;
      assert.equal(saved.created, true);
      assert.equal(saved.tool.status, "PENDING");
      assert.equal(saved.publicChanged, false);
    });
    await database.query('UPDATE "Tool" SET status = $1 WHERE id = $2', ["APPROVED", id!]);
    await t.test("pure discovery updates are allowed without credentials and do not invalidate", async () => {
      const saved = await save(100, false, "second-discovery");
      assert.equal(saved.tool.status, "APPROVED");
      assert.equal(saved.publicChanged, false);
      assert.equal((await database.query<{ count: number }>('SELECT count(*)::int AS count FROM "ToolDiscovery" WHERE "toolId" = $1', [id!])).rows[0].count, 2);
    });
    await t.test("a stale PENDING snapshot cannot mutate a now APPROVED tool without publication permission", async () => {
      await assert.rejects(save(200, false, "blocked-discovery"), /Public catalog changes require configured cache invalidation/);
      assert.equal((await database.query<{ githubStars: number }>('SELECT "githubStars" FROM "Tool" WHERE id = $1', [id!])).rows[0].githubStars, 100);
      assert.equal((await database.query<{ count: number }>('SELECT count(*)::int AS count FROM "ToolDiscovery" WHERE "sourceKey" = $1', ["blocked-discovery"])).rows[0].count, 0);
    });
    await t.test("a real APPROVED field update returns publicChanged only on its committed change", async () => {
      const changed = await save(200, true);
      assert.equal(changed.publicChanged, true);
      assert.equal(changed.tool.githubStars, 200);
      const repeated = await save(200, true);
      assert.equal(repeated.publicChanged, false);
    });
  } finally {
    await database.close();
  }
});

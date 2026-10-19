import assert from "node:assert/strict";
import test from "node:test";
import { CLOUD_RECOVERY_NOT_BEFORE, CLOUD_RECOVERY_TARGET as target, CloudRecoveryError } from "./cloud-recovery";
import { ISSUE_9, issue9CompletionBody } from "./cloud-publication";
import { createCloudWorkflow, type WorkflowConfiguration } from "./cloud-workflow";

const OLD_PASSWORD = "old-workflow-fixture-password";
const NEW_PASSWORD = "new-workflow-fixture-password";
const SHA = "a".repeat(40);
const config: WorkflowConfiguration = {
  neonApiKey: "fixture-neon-api-key",
  vercelToken: "fixture-vercel-api-key",
  githubToken: "fixture-github-token",
  databaseUrl: `postgresql://${target.role}:${OLD_PASSWORD}@${target.pooledHostname}/${target.database}?sslmode=require`,
  revalidationSecret: "fixture-revalidation-secret-at-least-32-characters",
  cronSecret: "fixture-cron-secret-at-least-32-characters",
  sha: SHA,
  repository: ISSUE_9.repository,
  ref: "refs/heads/main",
};
type Variable = { id: string; key: string; type: string; target: string[]; value?: string; gitBranch?: string | null; customEnvironmentIds?: string[] };
type Options = {
  now?: number;
  config?: Partial<WorkflowConfiguration>;
  projectId?: string;
  endpoint?: Record<string, unknown>;
  vercelProjectId?: string;
  databaseVariables?: Variable[];
  checkpoints?: Variable[];
  completedAt?: string;
  issueClosed?: boolean;
  mainSha?: string;
  fail?: "deployment" | "validation" | "publication" | "canary" | "drain" | "online" | "close";
};

function fixture(options: Options = {}) {
  const calls: { method: string; host: string; path: string }[] = [];
  const events: string[] = [];
  const masked: string[] = [];
  const variables: Variable[] = options.databaseVariables ?? [
    { id: "env-db", key: "DATABASE_URL", type: "sensitive", target: ["production", "preview"] },
    { id: "env-revalidation", key: "REVALIDATION_SECRET", type: "sensitive", target: ["production", "preview"] },
    { id: "env-cron", key: "CRON_SECRET", type: "sensitive", target: ["production", "preview"] },
    { id: "env-metrics", key: "TOOL_METRICS_MODE", value: "direct", type: "plain", target: ["production", "preview"] },
  ];
  if (options.checkpoints) variables.push(...options.checkpoints);
  if (options.completedAt) variables.push({ id: "env-completed", key: "RECOVERY_COMPLETED_AT", value: options.completedAt, type: "plain", target: ["production", "preview"] });
  let password = OLD_PASSWORD;
  let disabled = true;
  let closed = options.issueClosed ?? false;
  let deployments = 0;
  let resetCalls = 0;
  let validationCalls = 0;
  let publicationCalls = 0;
  const comments: Record<string, unknown>[] = [];
  const envPath = `/v9/projects/${target.vercelProjectId}/env`;
  const endpointPath = `/projects/${target.projectId}/endpoints/${target.endpointId}`;
  const issuePath = `/repos/${ISSUE_9.repository}/issues/${ISSUE_9.number}`;
  const json = (value: unknown, status = 200) => Response.json(value, { status });
  const issue = () => ({ number: ISSUE_9.number, state: closed ? "closed" : "open", state_reason: closed ? "completed" : null });
  const endpoint = () => ({ id: target.endpointId, project_id: target.projectId, branch_id: target.branchId, host: target.hostname,
    disabled, autoscaling_limit_min_cu: 0.25, autoscaling_limit_max_cu: 0.25, suspend_timeout_seconds: 0, ...options.endpoint });

  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.hostname === "console.neon.tech" ? url.pathname.replace(/^\/api\/v2/, "") : url.pathname;
    calls.push({ method, host: url.hostname, path });
    assert.equal(init?.redirect, "error");
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (url.hostname === "console.neon.tech") {
      if (path === `/projects/${target.projectId}`) return json({ project: { id: options.projectId ?? target.projectId } });
      if (path === endpointPath) {
        if (method === "PATCH") { disabled = body.endpoint.disabled; events.push(disabled ? "endpoint-disabled" : "endpoint-enabled"); }
        return json({ endpoint: endpoint(), operations: [] });
      }
      if (path.endsWith("/operations")) return json({ operations: [] });
      if (path.endsWith("/reveal_password")) return json({ password });
      if (path.endsWith("/reset_password")) {
        resetCalls++;
        events.push("password-reset");
        password = NEW_PASSWORD;
        return json({ role: { password }, operations: [] });
      }
    }
    if (url.hostname === "api.vercel.com") {
      assert.equal(url.searchParams.get("teamId"), target.vercelTeamId);
      if (path === `/v9/projects/${target.vercelProjectId}`) return json({ id: options.vercelProjectId ?? target.vercelProjectId });
      if (path === envPath && method === "GET") return json({ envs: variables });
      if (path.startsWith(`${envPath}/`) && method === "PATCH") {
        const variable = variables.find((item) => item.id === path.slice(envPath.length + 1));
        assert.ok(variable, "only fixture variables may be updated");
        variable.value = body.value;
        events.push(`variable:${variable.key}:${variable.key === "TOOL_METRICS_MODE" ? body.value : "saved"}`);
        return json(variable);
      }
      if (path === `/v10/projects/${target.vercelProjectId}/env` && method === "POST") {
        const variable = { ...body, id: `env-created-${body.key}` } as Variable;
        variables.push(variable);
        events.push(`variable:${variable.key}:saved`);
        return json({ created: variable, failed: [] }, 201);
      }
      if (path === "/v13/deployments" && method === "POST") {
        assert.equal(body.target, "production");
        assert.equal(body.project, target.vercelProjectId);
        assert.equal(body.gitSource.sha, SHA);
        deployments++;
        events.push(`deploy:${deployments}:created`);
        return json({ id: `dpl_fixture${deployments}` });
      }
      if (path.startsWith("/v13/deployments/") && method === "GET") {
        events.push(`deploy:${deployments}:ready`);
        return json({ id: path.split("/").at(-1), projectId: target.vercelProjectId, target: "production",
          meta: { githubCommitSha: SHA }, readyState: options.fail === "deployment" ? "ERROR" : "READY",
          aliasAssigned: true, alias: ["toools.top"] });
      }
      if (path === "/v4/aliases/toools.top" && method === "GET") {
        assert.equal(url.searchParams.get("projectId"), target.vercelProjectId);
        events.push(`deploy:${deployments}:alias-verified`);
        return json({ alias: "toools.top", projectId: target.vercelProjectId, deploymentId: `dpl_fixture${deployments}` });
      }
    }
    if (url.hostname === "api.github.com") {
      if (path === `/repos/${ISSUE_9.repository}/git/ref/heads/main`) {
        events.push("main-commit-checked");
        return json({ object: { sha: options.mainSha ?? SHA } });
      }
      if (path === issuePath) {
        if (method === "PATCH") {
          events.push("issue-close-attempt");
          if (options.fail === "close") return json({ error: "fixture issue close rejected" }, 503);
          assert.deepEqual(body, { state: "closed", state_reason: "completed" });
          closed = true;
          events.push("issue-closed");
        }
        return json(issue());
      }
      if (path === `${issuePath}/comments`) {
        if (method === "POST") {
          assert.equal(body.body, issue9CompletionBody());
          events.push("completion-comment");
          const comment = { id: comments.length + 1, body: body.body, user: { login: "github-actions[bot]" }, html_url: "https://github.com/comment/fixture" };
          comments.push(comment);
          return json(comment, 201);
        }
        return json(comments);
      }
      if (path === `/repos/${ISSUE_9.repository}/actions/workflows/neon-recovery.yml/disable`) {
        assert.equal(method, "PUT");
        events.push("workflow-disabled");
        return new Response(null, { status: 204 });
      }
    }
    if (url.origin === ISSUE_9.origin) {
      if (path === "/api/metrics/check") {
        events.push("queue-canary");
        assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.cronSecret}`);
        return json({ checked: true, isolated: true, producer: true, poll: true, acknowledged: options.fail !== "canary" });
      }
      if (path === "/api/metrics/flush") {
        events.push("queue-drain");
        return json(options.fail === "drain" ? { enabled: false } : { enabled: true, received: 0, acknowledged: 0, applied: 0, toolsUpdated: 0, hasMore: false });
      }
      if (path === "/api/revalidate") {
        events.push("catalog-refresh");
        assert.deepEqual(body, { catalog: true });
        assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${config.revalidationSecret}`);
        return json({ revalidated: true });
      }
      events.push(`online:${path}${url.search}`);
      if (options.fail === "online") return new Response("fixture unavailable", { status: 503 });
      const html: Record<string, string> = {
        "/": '<h1>Toools</h1><a href="/tools">Browse tools</a>',
        "/tools/mangatranslate": '<h1>MangaTranslate</h1><p>Image &amp; Media</p><a href="/api/tools/mangatranslate/out">Website</a><script type="application/ld+json">{"@type":"SoftwareApplication","name":"MangaTranslate","url":"https://www.mangatranslate.com/","applicationCategory":"Image & Media"}</script>',
        "/categories/image-media": '<a href="/tools/mangatranslate">MangaTranslate</a>',
        "/tools?q=MangaTranslate": '<a href="/tools/mangatranslate">MangaTranslate</a>',
        "/sitemap.xml": '<urlset><url><loc>https://toools.top/tools/mangatranslate</loc></url></urlset>',
      };
      assert.ok(html[path + url.search], "only reviewed public pages may be verified");
      return new Response(html[path + url.search], { headers: { "Content-Type": path.endsWith(".xml") ? "application/xml" : "text/html" } });
    }
    throw new Error(`Unhandled fixture request: ${method} ${url.hostname}${path}`);
  };
  const workflow = createCloudWorkflow({ ...config, ...options.config }, {
    fetcher,
    now: () => options.now ?? CLOUD_RECOVERY_NOT_BEFORE + 7 * 60_000,
    report: (stage) => { events.push(`stage:${stage}`); },
    mask: (secret) => { masked.push(secret); },
    validateDatabase: async (context) => {
      validationCalls++;
      assert.equal(new URL(context.databaseUrl).password, NEW_PASSWORD);
      assert.equal(new URL(context.directDatabaseUrl).hostname, target.hostname);
      assert.equal(disabled, false, "database validation must wait for completed rotation and endpoint enable");
      events.push("database-validate");
      if (options.fail === "validation") throw new Error("fixture validation rejected");
    },
    publishDatabase: async () => {
      publicationCalls++;
      events.push("database-publish");
      if (options.fail === "publication") throw new Error("fixture publication rejected");
    },
  });
  return { workflow, calls, events, masked, variables, state: () => ({ resetCalls, deployments, closed, validationCalls, publicationCalls }) };
}

function code(expected: string) {
  return (error: unknown) => error instanceof CloudRecoveryError && error.code === expected;
}
function assertReadOnly(mock: ReturnType<typeof fixture>) {
  assert.ok(mock.calls.every((call) => call.method === "GET"));
  assert.equal(mock.state().resetCalls, 0);
  assert.equal(mock.state().validationCalls, 0);
  assert.equal(mock.state().publicationCalls, 0);
}

test("preflight uses only management GET requests and never runs database or live-write callbacks", async () => {
  const mock = fixture({ now: CLOUD_RECOVERY_NOT_BEFORE - 1 });
  await mock.workflow.run("preflight");
  assert.equal(mock.calls.length, 6);
  assertReadOnly(mock);
  assert.ok(mock.events.includes("stage:cloud_preflight_passed"));
  assert.equal(mock.calls.some((call) => call.host === "toools.top"), false);
  assert.deepEqual(mock.calls.filter((call) => call.path.endsWith("/reveal_password")), [{
    method: "GET", host: "console.neon.tech", path: `/projects/${target.projectId}/branches/${target.branchId}/roles/${target.role}/reveal_password`,
  }]);
  assert.equal(mock.masked.length, 0, "read-only baseline verification must not export the management password");
});

test("pre-reset preflight rejects a database template that does not match the original role password", async () => {
  const mock = fixture({ now: CLOUD_RECOVERY_NOT_BEFORE - 1,
    config: { databaseUrl: config.databaseUrl.replace(OLD_PASSWORD, "different-fixture-baseline-password") } });
  await assert.rejects(mock.workflow.run("preflight"), code("database_baseline_mismatch"));
  assert.equal(mock.calls.length, 6);
  assertReadOnly(mock);
  assert.equal(mock.events.includes("stage:cloud_preflight_passed"), false);
  assert.equal(mock.masked.length, 0);
});

test("pre-reset preflight requires the exposed endpoint to remain disabled", async () => {
  const mock = fixture({ now: CLOUD_RECOVERY_NOT_BEFORE - 1, endpoint: { disabled: false } });
  await assert.rejects(mock.workflow.run("preflight"), code("endpoint_not_restricted"));
  assert.equal(mock.calls.length, 6);
  assertReadOnly(mock);
  assert.equal(mock.events.includes("stage:cloud_preflight_passed"), false);
});

test("recovery date gates run before every API request, including exactly at the end of the window", async () => {
  for (const now of [CLOUD_RECOVERY_NOT_BEFORE - 1, Date.parse("2026-11-04T00:00:00Z"), Date.parse("2027-11-01T00:07:00Z")]) {
    const mock = fixture({ now });
    await assert.rejects(mock.workflow.run("recover"), code("outside_recovery_window"));
    assert.deepEqual(mock.calls, []);
  }
});

test("wrong repository, non-main refs, or incomplete commit IDs cannot inspect or modify cloud resources", async () => {
  for (const override of [{ repository: "someone/toools" }, { ref: "refs/heads/feature" }, { sha: "abc123" }]) {
    const mock = fixture({ config: override });
    await assert.rejects(mock.workflow.run("preflight"), code("untrusted_workflow_target"));
    assert.deepEqual(mock.calls, []);
  }
});

test("every required secret is validated before cloud access", async () => {
  for (const key of ["neonApiKey", "vercelToken", "githubToken", "databaseUrl", "revalidationSecret", "cronSecret"] as const) {
    const mock = fixture({ config: { [key]: "" } });
    await assert.rejects(mock.workflow.run("preflight"), code("missing_cloud_secrets"));
    assert.deepEqual(mock.calls, []);
  }
  for (const key of ["revalidationSecret", "cronSecret"] as const) {
    const mock = fixture({ config: { [key]: "short" } });
    await assert.rejects(mock.workflow.run("preflight"), code("missing_cloud_secrets"));
    assert.deepEqual(mock.calls, []);
  }
});

test("preflight rejects wrong Neon or Vercel identity without any mutation", async () => {
  for (const override of [
    { projectId: "another-project" }, { vercelProjectId: "another-vercel-project" },
    { endpoint: { branch_id: "another-branch" } }, { endpoint: { host: "another-host.example" } },
    { endpoint: { id: "another-endpoint" } }, { endpoint: { project_id: "another-project" } },
  ]) {
    const mock = fixture(override);
    await assert.rejects(mock.workflow.run("preflight"), code("cloud_identity_mismatch"));
    assertReadOnly(mock);
  }
});

test("preflight rejects unsafe connection templates before making an API request", async () => {
  const unsafe = [
    config.databaseUrl.replace("postgresql:", "https:"),
    config.databaseUrl.replace(OLD_PASSWORD, ""),
    config.databaseUrl.replace(`/${target.database}`, `:6432/${target.database}`),
    config.databaseUrl.replace(target.pooledHostname, "other.example"),
    config.databaseUrl.replace(`/${target.database}`, "/other-database"),
    config.databaseUrl.replace(target.role, "other-role"),
  ];
  for (const databaseUrl of unsafe) {
    const mock = fixture({ config: { databaseUrl } });
    await assert.rejects(mock.workflow.run("preflight"));
    assert.deepEqual(mock.calls, []);
  }
});

test("ambiguous or incorrectly protected DATABASE_URL configuration stops preflight", async () => {
  const variable: Variable = { id: "env-db", key: "DATABASE_URL", type: "sensitive", target: ["production", "preview"] };
  for (const databaseVariables of [[], [variable, { ...variable, id: "duplicate" }], [{ ...variable, type: "plain" }],
    [{ ...variable, target: ["production"] }], [{ ...variable, gitBranch: "feature" }],
    [{ ...variable, customEnvironmentIds: ["custom-environment"] }]]) {
    const mock = fixture({ databaseVariables });
    await assert.rejects(mock.workflow.run("preflight"), code("unexpected_database_configuration"));
    assertReadOnly(mock);
  }
});

test("checkpoint journals must be unique global plain variables with bounded timestamps", async () => {
  for (const key of ["RECOVERY_RESET_STARTED_AT", "RECOVERY_COMPLETED_AT"]) {
    const valid: Variable = { id: `env-${key}`, key, type: "plain", target: ["production", "preview"], value: new Date(CLOUD_RECOVERY_NOT_BEFORE).toISOString() };
    for (const checkpoints of [
      [valid, { ...valid, id: "duplicate" }], [{ ...valid, type: "sensitive" }],
      [{ ...valid, target: ["development"] }], [{ ...valid, gitBranch: "feature" }],
      [{ ...valid, customEnvironmentIds: ["custom-environment"] }], [{ ...valid, value: undefined }],
    ]) {
      const mock = fixture({ checkpoints });
      await assert.rejects(mock.workflow.run("preflight"), code("ambiguous_cloud_checkpoint"));
      assertReadOnly(mock);
    }
    for (const value of ["not-a-date", new Date(CLOUD_RECOVERY_NOT_BEFORE - 1).toISOString(), "2026-11-01T00:10:00Z"]) {
      const mock = fixture({ checkpoints: [{ ...valid, value }] });
      await assert.rejects(mock.workflow.run("preflight"), code("invalid_cloud_checkpoint"));
      assertReadOnly(mock);
    }
  }
});

test("completed checkpoint plus completed issue makes preflight read-only and recovery only disables this workflow", async () => {
  const completedAt = new Date(CLOUD_RECOVERY_NOT_BEFORE + 60_000).toISOString();
  const preflight = fixture({ completedAt, issueClosed: true });
  await preflight.workflow.run("preflight");
  assertReadOnly(preflight);
  assert.ok(preflight.events.includes("stage:recovery_already_completed"));
  const recovery = fixture({ completedAt, issueClosed: true });
  await recovery.workflow.run("recover");
  assert.equal(recovery.state().resetCalls, 0);
  assert.equal(recovery.state().deployments, 0);
  assert.deepEqual(recovery.calls.filter((call) => call.method !== "GET"), [{ method: "PUT", host: "api.github.com", path: `/repos/${ISSUE_9.repository}/actions/workflows/neon-recovery.yml/disable` }]);
});

test("full recovery verifies deployment, database, isolated queue and live listing before issue closure and self-disable", async () => {
  const mock = fixture();
  await mock.workflow.run("recover");
  const ordered = ["password-reset", "deploy:1:ready", "deploy:1:alias-verified", "endpoint-enabled", "database-validate", "database-publish", "queue-canary",
    "variable:TOOL_METRICS_MODE:queue", "deploy:2:ready", "deploy:2:alias-verified", "queue-drain", "catalog-refresh", "online:/sitemap.xml", "completion-comment", "issue-closed",
    "variable:RECOVERY_COMPLETED_AT:saved", "workflow-disabled"];
  let previous = -1;
  for (const event of ordered) {
    const index = mock.events.indexOf(event);
    assert.ok(index > previous, `${event} must follow prior verified stage`);
    previous = index;
  }
  assert.ok(mock.events.indexOf("variable:RECOVERY_RESET_STARTED_AT:saved") < mock.events.indexOf("password-reset"));
  assert.deepEqual(mock.state(), { resetCalls: 1, deployments: 2, closed: true, validationCalls: 1, publicationCalls: 1 });
  assert.ok(mock.masked.includes(NEW_PASSWORD));
  assert.ok(mock.masked.some((value) => value.includes(NEW_PASSWORD) && value.includes(target.pooledHostname)));
  assert.ok(mock.events.every((event) => ![OLD_PASSWORD, NEW_PASSWORD, config.neonApiKey, config.vercelToken].some((secret) => event.includes(secret))));
  assert.equal(mock.calls.some((call) => /billing|plans|organizations/.test(call.path)), false);
  const initialResets = mock.state().resetCalls;
  await mock.workflow.run("recover");
  assert.equal(mock.state().resetCalls, initialResets, "completed reruns must not rotate the password again");
  assert.equal(mock.events.filter((event) => event === "completion-comment").length, 1);
  assert.equal(mock.events.filter((event) => event === "main-commit-checked").length, 2, "each production deployment must recheck the reviewed main commit");
});

test("a changed main commit blocks deployment, publication and endpoint enable", async () => {
  const mock = fixture({ mainSha: "b".repeat(40) });
  await assert.rejects(mock.workflow.run("recover"), code("replacement_deployment_failed"));
  assert.equal(mock.state().deployments, 0);
  assert.equal(mock.state().closed, false);
  assert.equal(mock.state().validationCalls, 0);
  assert.equal(mock.events.includes("endpoint-enabled"), false);
  assert.equal(mock.events.includes("workflow-disabled"), false);
});

for (const fail of ["deployment", "validation", "publication", "canary", "drain", "online", "close"] as const) {
  test(`${fail} failure never writes a completed marker or disables recovery`, async () => {
    const mock = fixture({ fail });
    await assert.rejects(mock.workflow.run("recover"));
    assert.equal(mock.state().closed, false);
    assert.equal(mock.variables.some((variable) => variable.key === "RECOVERY_COMPLETED_AT"), false);
    assert.equal(mock.events.includes("workflow-disabled"), false);
    if (fail !== "close") assert.equal(mock.events.includes("completion-comment"), false);
    if (["deployment", "validation", "publication", "canary"].includes(fail)) {
      assert.equal(mock.events.includes("variable:TOOL_METRICS_MODE:queue"), false);
    }
    if (["deployment", "validation", "publication"].includes(fail)) assert.equal(mock.events.includes("queue-canary"), false);
  });
}

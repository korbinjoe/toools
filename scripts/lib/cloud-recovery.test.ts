import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOUD_RECOVERY_NOT_BEFORE, CLOUD_RECOVERY_TARGET, CloudRecoveryError,
  createCloudRecovery, type CloudRecoveryCredentials, type CloudRecoveryStage,
} from "./cloud-recovery";

const OLD = "old-dummy-password-001";
const NEW = "new-dummy-password-002";
const template = `postgresql://neondb_owner:${OLD}@${CLOUD_RECOVERY_TARGET.pooledHostname}/neondb?sslmode=require`;
const credentials: CloudRecoveryCredentials = {
  databaseUrl: template, neonApiKey: "dummy-neon-key", vercelToken: "dummy-vercel-key",
  revalidationSecret: "dummy-revalidation-secret-length-at-least-32",
  cronSecret: "dummy-cron-secret-length-at-least-32",
};

function setup(options: {
  date?: number; currentPassword?: string; quotaResponses?: number;
  resetLost?: "changed" | "unchanged"; checkpointFail?: boolean; deploymentFail?: boolean;
  operationStatus?: string; invalidEndpoint?: boolean; environmentScope?: string[];
  failEnvironmentKey?: string; resetStatus?: number;
  failedCreate?: boolean;
  initialMaxCu?: number;
} = {}) {
  let time = options.date ?? CLOUD_RECOVERY_NOT_BEFORE;
  let password = options.currentPassword ?? OLD;
  let disabled = true;
  let maxCu = options.initialMaxCu ?? 0.25;
  let quota = options.quotaResponses ?? 0;
  let operationPolls = 0;
  let resetCount = 0;
  let checkpoint: string | undefined;
  let marker: string | null = null;
  let deployments = 0;
  const stages: CloudRecoveryStage[] = [];
  const mutations: { service: string; path: string; method: string; body: Record<string, unknown> }[] = [];
  const calls: string[] = [];
  const envs = [{ id: "env-db", key: "DATABASE_URL", type: "sensitive", target: options.environmentScope ?? ["production", "preview"] }];
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const endpoint = () => ({ id: CLOUD_RECOVERY_TARGET.endpointId,
    project_id: CLOUD_RECOVERY_TARGET.projectId, branch_id: CLOUD_RECOVERY_TARGET.branchId,
    host: options.invalidEndpoint ? "other.example" : CLOUD_RECOVERY_TARGET.hostname, disabled,
    autoscaling_limit_min_cu: 0.25, autoscaling_limit_max_cu: maxCu, suspend_timeout_seconds: 0 });
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/api/v2", "");
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (method !== "GET") mutations.push({ service: url.hostname, path, method, body });
    if (url.hostname === "api.vercel.com") {
      assert.equal(url.searchParams.get("teamId"), CLOUD_RECOVERY_TARGET.vercelTeamId);
      if (method === "GET") return response({ envs });
      const key = method === "PATCH" ? envs.find((item) => path.endsWith(item.id))?.key : body.key;
      if (key === options.failEnvironmentKey) return response({ error: { message: "dummy response must remain private" } }, 500);
      if (method === "PATCH") return response({ ...envs.find((item) => path.endsWith(item.id)) });
      assert.ok(path.startsWith("/v10/projects/"));
      return response({ created: { id: `env-${key}`, key, target: body.target, type: body.type }, failed: options.failedCreate ? [{ error: { message: "dummy private failure" } }] : [] }, 201);
    }
    if (path.includes("/endpoints/")) {
      if (method === "PATCH") {
        disabled = body.endpoint.disabled;
        if (body.endpoint.autoscaling_limit_max_cu !== undefined) maxCu = body.endpoint.autoscaling_limit_max_cu;
      }
      return response({ endpoint: endpoint(), operations: [] });
    }
    if (path.endsWith("/reveal_password")) return response({ password });
    if (path.endsWith("/reset_password")) {
      resetCount++;
      if (quota-- > 0) return response({ code: "quota_exceeded", message: "quota exceeded" }, 402);
      if (options.resetStatus) return response({ message: "dummy private response" }, options.resetStatus);
      if (options.resetLost) {
        if (options.resetLost === "changed") password = NEW;
        throw new Error("dummy network failure containing a secret must not escape");
      }
      password = NEW;
      return response({ role: { password }, operations: [{ id: "op-reset", status: options.operationStatus ?? "running" }] });
    }
    if (path.endsWith("/operations")) return response({ operations: [] });
    if (path.includes("/operations/op-reset")) {
      operationPolls++;
      return response({ operation: { id: "op-reset", status: options.operationStatus ?? "finished" } });
    }
    throw new Error("unexpected mock request");
  };
  const recovery = createCloudRecovery({
    fetch: fetcher, now: () => time, sleep: async (ms) => { time += ms; },
    checkpointDatabaseUrl: async (url) => { if (options.checkpointFail) throw new Error("dummy checkpoint private error"); checkpoint = url; },
    checkpointResetStarted: async (timestamp) => { marker = timestamp; },
    deployAndWaitReady: async (context) => {
      assert.equal(disabled, true, "compute stays restricted throughout the deployment");
      assert.equal(new URL(context.databaseUrl).password, NEW);
      assert.equal(mutations.filter((item) => item.service === "api.vercel.com").length, 4);
      deployments++;
      if (options.deploymentFail) throw new Error("dummy deployment failure with a secret");
    },
    report: (stage) => { stages.push(stage); }, operationTimeoutMs: 6000, quotaTimeoutMs: 120_000,
  });
  return { recovery, stages, mutations, calls,
    state: () => ({ time, password, disabled, operationPolls, resetCount, checkpoint, marker, deployments }) };
}

function hasCode(code: string) {
  return (error: unknown) => error instanceof CloudRecoveryError && error.code === code && error.message === code;
}

test("the date guard makes no request and no mutation before November 1", async () => {
  const mock = setup({ date: CLOUD_RECOVERY_NOT_BEFORE - 1 });
  await assert.rejects(mock.recovery.run(credentials), hasCode("recovery_not_due"));
  assert.deepEqual(mock.calls, []);
});

test("rotation checkpoints the password, waits operations and deployments, then enables only the intended endpoint", async () => {
  const mock = setup();
  const result = await mock.recovery.run(credentials);
  assert.equal(result.rotationReused, false);
  assert.equal(new URL(result.directDatabaseUrl).hostname, CLOUD_RECOVERY_TARGET.hostname);
  assert.equal(new URL(result.databaseUrl).hostname, CLOUD_RECOVERY_TARGET.pooledHostname);
  assert.deepEqual(mock.state(), {
    time: CLOUD_RECOVERY_NOT_BEFORE + 3000, password: NEW, disabled: false, operationPolls: 1,
    resetCount: 1, checkpoint: result.databaseUrl, marker: "2026-11-01T00:00:00.000Z", deployments: 1,
  });
  assert.ok(mock.stages.indexOf("deployments_ready") < mock.stages.indexOf("endpoint_enabled"));
  const databaseWrite = mock.mutations.find((item) => item.path.endsWith("env-db"));
  assert.deepEqual(databaseWrite?.body, { value: result.databaseUrl });
  assert.deepEqual(mock.mutations.filter((item) => item.path.includes("/endpoints/")).map((item) => item.body), [{ endpoint: { disabled: false } }]);
  assert.ok(mock.mutations.every((item) => !/billing|plan|quota/.test(item.path)));
});

test("a changed management password reconstructs a lost checkpoint without resetting again", async () => {
  const mock = setup({ currentPassword: NEW });
  const result = await mock.recovery.run(credentials);
  assert.equal(result.rotationReused, true);
  assert.equal(mock.state().resetCount, 0);
  assert.equal(mock.state().checkpoint, result.databaseUrl);
});

test("recovery caps the production endpoint at 0.25 CU with the Free five-minute default before rotation", async () => {
  const mock = setup({ initialMaxCu: 2 });
  await mock.recovery.run(credentials);
  const writes = mock.mutations.filter((item) => item.path.includes("/endpoints/"));
  assert.deepEqual(writes.map((item) => item.body), [
    { endpoint: { disabled: true, autoscaling_limit_min_cu: 0.25, autoscaling_limit_max_cu: 0.25, suspend_timeout_seconds: 0 } },
    { endpoint: { disabled: false } },
  ]);
  const restrictionIndex = mock.mutations.findIndex((item) => item.path.includes("/endpoints/"));
  const resetIndex = mock.mutations.findIndex((item) => item.path.endsWith("/reset_password"));
  assert.ok(restrictionIndex < resetIndex);
});

test("a durable new-password checkpoint makes reruns idempotent", async () => {
  const mock = setup({ currentPassword: NEW });
  const result = await mock.recovery.run({ ...credentials, recoveryDatabaseUrl: template.replace(OLD, NEW), resetStartedAt: "2026-11-01T00:00:00Z" });
  assert.equal(result.rotationReused, true);
  assert.equal(mock.state().resetCount, 0);
});

test("a reset start marker with an unchanged password stops rather than issuing another reset", async () => {
  const mock = setup();
  await assert.rejects(mock.recovery.run({ ...credentials, resetStartedAt: "2026-11-01T00:00:00Z" }), hasCode("reset_outcome_unknown"));
  assert.equal(mock.state().resetCount, 0);
  assert.equal(mock.state().disabled, true);
});

test("a lost reset response is reconciled in memory and never blindly retried", async () => {
  const mock = setup({ resetLost: "changed" });
  const result = await mock.recovery.run(credentials);
  assert.equal(result.rotationReused, true);
  assert.equal(mock.state().resetCount, 1);
  assert.equal(mock.state().checkpoint, result.databaseUrl);
});

test("an unknown reset outcome with no changed password stays restricted", async () => {
  const mock = setup({ resetLost: "unchanged" });
  await assert.rejects(mock.recovery.run(credentials), hasCode("reset_outcome_unknown"));
  assert.equal(mock.state().resetCount, 1);
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.mutations.filter((item) => item.service === "api.vercel.com").length, 0);
});

test("only an explicit quota rejection allows a delayed password-reset retry", async () => {
  const mock = setup({ quotaResponses: 2 });
  await mock.recovery.run(credentials);
  assert.equal(mock.state().resetCount, 3);
  assert.equal(mock.stages.filter((stage) => stage === "quota_wait").length, 2);
  assert.equal(mock.state().time, CLOUD_RECOVERY_NOT_BEFORE + 123_000);
});

test("persistent quota stops after the free reset grace period without enabling the endpoint", async () => {
  const mock = setup({ quotaResponses: 100 });
  await assert.rejects(mock.recovery.run(credentials), hasCode("quota_exceeded"));
  assert.equal(mock.state().resetCount, 3);
  assert.equal(mock.state().marker, null);
  assert.equal(mock.state().disabled, true);
});

test("authentication failures are not automatically retried", async () => {
  const mock = setup({ resetStatus: 403 });
  await assert.rejects(mock.recovery.run(credentials), hasCode("neon_authentication_failed"));
  assert.equal(mock.state().resetCount, 1);
});

test("a failed operation leaves the endpoint restricted and the new credential recoverable", async () => {
  const mock = setup({ operationStatus: "failed" });
  await assert.rejects(mock.recovery.run(credentials), hasCode("neon_operation_failed"));
  assert.equal(new URL(mock.state().checkpoint!).password, NEW);
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.state().deployments, 0);
});

test("a still-running password operation cannot be mistaken for a completed rotation", async () => {
  const mock = setup({ operationStatus: "running" });
  await assert.rejects(mock.recovery.run(credentials), hasCode("neon_operation_pending"));
  assert.equal(mock.state().operationPolls, 2);
  assert.equal(mock.state().resetCount, 1);
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.state().deployments, 0);
});

test("a checkpoint failure never updates Vercel or enables the endpoint", async () => {
  const mock = setup({ checkpointFail: true });
  await assert.rejects(mock.recovery.run(credentials), hasCode("credential_checkpoint_failed"));
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.mutations.filter((item) => item.service === "api.vercel.com").length, 0);
});

test("a deployment failure cannot expose the endpoint before replacement configuration is ready", async () => {
  const mock = setup({ deploymentFail: true });
  await assert.rejects(mock.recovery.run(credentials), hasCode("replacement_deployment_failed"));
  assert.equal(mock.state().disabled, true);
  assert.ok(!mock.stages.includes("endpoint_enabled"));
});

test("Vercel environment failure prevents deployment and endpoint enable", async () => {
  const mock = setup({ failEnvironmentKey: "CRON_SECRET" });
  await assert.rejects(mock.recovery.run(credentials), hasCode("vercel_request_failed"));
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.state().deployments, 0);
});

test("an HTTP-success environment response with a failed item is not treated as configured", async () => {
  const mock = setup({ failedCreate: true });
  await assert.rejects(mock.recovery.run(credentials), hasCode("vercel_environment_create_failed"));
  assert.equal(mock.state().disabled, true);
  assert.equal(mock.state().deployments, 0);
});

test("target and scope mismatches are detected before a password reset", async () => {
  for (const mock of [setup({ invalidEndpoint: true }), setup({ environmentScope: ["production"] })]) {
    await assert.rejects(mock.recovery.run(credentials));
    assert.equal(mock.state().resetCount, 0);
    assert.deepEqual(mock.mutations, []);
  }
});

test("a conflicting durable checkpoint stops rather than overwriting the credential", async () => {
  const mock = setup({ currentPassword: NEW });
  await assert.rejects(mock.recovery.run({ ...credentials, recoveryDatabaseUrl: template.replace(OLD, "third-dummy-password") }), hasCode("recovery_checkpoint_password_mismatch"));
  assert.equal(mock.state().resetCount, 0);
  assert.equal(mock.state().disabled, true);
});

test("report events and errors contain only safe codes, never request or response credentials", async () => {
  const mock = setup({ deploymentFail: true });
  let failure: unknown;
  try { await mock.recovery.run(credentials); } catch (error) { failure = error; }
  const publicOutput = JSON.stringify({ stages: mock.stages, failure });
  for (const value of [OLD, NEW, credentials.neonApiKey, credentials.vercelToken, credentials.revalidationSecret, credentials.cronSecret]) assert.ok(!publicOutput.includes(value));
  assert.equal((failure as CloudRecoveryError).message, "replacement_deployment_failed");
});

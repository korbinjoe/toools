import { CLOUD_RECOVERY_NOT_BEFORE, CLOUD_RECOVERY_TARGET as target, CloudRecoveryError, createCloudRecovery, type CloudRecoveryContext, type CloudRecoveryCredentials } from "./cloud-recovery";
import { completeIssue9, ISSUE_9, verifyIssue9Online, waitForVercelDeployment } from "./cloud-publication";

const WINDOW_END = Date.parse("2026-11-04T00:00:00Z");
type Json = Record<string, unknown>;
type Variable = { id: string; key: string; value?: string; type: string; target: string[]; gitBranch?: string | null; customEnvironmentIds?: string[] };
export type WorkflowConfiguration = CloudRecoveryCredentials & { githubToken: string; sha: string; repository: string; ref: string };
export type WorkflowDependencies = {
  fetcher?: typeof fetch;
  now?: () => number;
  report?: (stage: string) => void;
  mask?: (secret: string) => void;
  validateDatabase: (context: CloudRecoveryContext) => Promise<void>;
  publishDatabase: (context: CloudRecoveryContext) => Promise<void>;
};

function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CloudRecoveryError("unexpected_cloud_response");
  return value as Json;
}

export function createCloudWorkflow(config: WorkflowConfiguration, dependencies: WorkflowDependencies) {
  const fetcher = dependencies.fetcher ?? fetch;
  const now = dependencies.now ?? Date.now;
  const report = dependencies.report ?? (() => {});
  const envPath = `/v9/projects/${target.vercelProjectId}/env`;

  async function api(service: "neon" | "vercel" | "github", path: string, init: RequestInit = {}): Promise<Json> {
    const base = { neon: "https://console.neon.tech/api/v2", vercel: "https://api.vercel.com", github: "https://api.github.com" }[service];
    const suffix = service === "vercel" ? `${path.includes("?") ? "&" : "?"}teamId=${target.vercelTeamId}` : "";
    let response: Response;
    try {
      response = await fetcher(`${base}${path}${suffix}`, { ...init, headers: {
        Authorization: `Bearer ${{ neon: config.neonApiKey, vercel: config.vercelToken, github: config.githubToken }[service]}`,
        "Content-Type": "application/json", Accept: "application/json",
        ...(service === "github" ? { "X-GitHub-Api-Version": "2026-03-10" } : {}),
      }, signal: AbortSignal.timeout(30_000), redirect: "error" });
    } catch { throw new CloudRecoveryError(`${service}_request_failed`); }
    if (!response.ok) throw new CloudRecoveryError(`${service}_request_rejected`, response.status);
    if (response.status === 204) return {};
    return object(await response.json().catch(() => null));
  }

  async function variables(): Promise<Variable[]> {
    const result = await api("vercel", envPath);
    if (!Array.isArray(result.envs)) throw new CloudRecoveryError("unexpected_vercel_environment");
    return result.envs.map((item) => object(item) as Variable);
  }

  async function setVariable(key: string, value: string, secret = false): Promise<void> {
    const matches = (await variables()).filter((variable) => variable.key === key);
    if (matches.length > 1 || matches.some((variable) => variable.gitBranch || variable.customEnvironmentIds?.length)) throw new CloudRecoveryError("ambiguous_cloud_checkpoint");
    if (matches.length) {
      const variable = matches[0];
      if (variable.target?.slice().sort().join(",") !== "preview,production"
        || secret && !["sensitive", "encrypted"].includes(variable.type)
        || !secret && variable.type !== "plain") throw new CloudRecoveryError("unexpected_cloud_checkpoint_scope");
      const result = await api("vercel", `${envPath}/${encodeURIComponent(variable.id)}`, { method: "PATCH", body: JSON.stringify({ value }) });
      if (result.id !== variable.id || result.key !== key) throw new CloudRecoveryError("cloud_checkpoint_update_failed");
    } else {
      const result = await api("vercel", `/v10/projects/${target.vercelProjectId}/env`, {
        method: "POST", body: JSON.stringify({ key, value, type: secret ? "sensitive" : "plain", target: ["production", "preview"] }),
      });
      if (!Array.isArray(result.failed) || result.failed.length || object(result.created).key !== key) throw new CloudRecoveryError("cloud_checkpoint_create_failed");
    }
  }

  async function deploy(): Promise<void> {
    const main = await api("github", `/repos/${ISSUE_9.repository}/git/ref/heads/main`);
    if (object(main.object).sha !== config.sha) throw new CloudRecoveryError("main_changed_during_recovery");
    // A fresh Git deployment reads the updated project environment. Redeploying
    // an old deployment can inherit its stale DATABASE_URL instead.
    const result = await api("vercel", "/v13/deployments?forceNew=1", { method: "POST", body: JSON.stringify({
      name: "toools", project: target.vercelProjectId, target: "production",
      gitSource: { type: "github", repoId: "695019504", ref: config.sha, sha: config.sha },
    }) });
    if (typeof result.id !== "string") throw new CloudRecoveryError("deployment_id_missing");
    await waitForVercelDeployment({ token: config.vercelToken, teamId: target.vercelTeamId,
      projectId: target.vercelProjectId, deploymentId: result.id, expectedSha: config.sha, fetcher });
    report("production_deployment_verified");
  }

  async function site(path: string, secret: string, method: string, body?: unknown, timeout = 30_000): Promise<Json> {
    let response: Response;
    try {
      response = await fetcher(`${ISSUE_9.origin}${path}`, { method, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(timeout) });
    } catch { throw new CloudRecoveryError("production_health_request_failed"); }
    if (!response.ok) throw new CloudRecoveryError("production_health_rejected", response.status);
    return object(await response.json().catch(() => null));
  }

  async function disableWorkflow(): Promise<void> {
    await api("github", `/repos/${ISSUE_9.repository}/actions/workflows/neon-recovery.yml/disable`, { method: "PUT" });
    report("recovery_workflow_disabled");
  }

  return {
    async run(mode: "preflight" | "recover"): Promise<void> {
      if (config.repository !== ISSUE_9.repository || config.ref !== "refs/heads/main" || !/^[a-f0-9]{40}$/.test(config.sha)) throw new CloudRecoveryError("untrusted_workflow_target");
      if (mode === "recover" && (now() < CLOUD_RECOVERY_NOT_BEFORE || now() >= WINDOW_END)) throw new CloudRecoveryError("outside_recovery_window");
      if (![config.neonApiKey, config.vercelToken, config.databaseUrl, config.githubToken].every(Boolean)
        || config.revalidationSecret.length < 32 || config.cronSecret.length < 32) throw new CloudRecoveryError("missing_cloud_secrets");
      let template: URL;
      try { template = new URL(config.databaseUrl); } catch { throw new CloudRecoveryError("database_template_mismatch"); }
      if (!["postgres:", "postgresql:"].includes(template.protocol) || !template.password || template.port && template.port !== "5432"
        || !new Set<string>([target.hostname, target.pooledHostname]).has(template.hostname)
        || decodeURIComponent(template.username) !== target.role || template.pathname !== `/${target.database}`) throw new CloudRecoveryError("database_template_mismatch");

      const [project, endpointResponse, vercelProject, issue, vars] = await Promise.all([
        api("neon", `/projects/${target.projectId}`),
        api("neon", `/projects/${target.projectId}/endpoints/${target.endpointId}`),
        api("vercel", `/v9/projects/${target.vercelProjectId}`),
        api("github", `/repos/${ISSUE_9.repository}/issues/${ISSUE_9.number}`),
        variables(),
      ]);
      const endpoint = object(endpointResponse.endpoint);
      if (object(project.project).id !== target.projectId || endpoint.id !== target.endpointId || endpoint.project_id !== target.projectId || endpoint.branch_id !== target.branchId
        || endpoint.host !== target.hostname || vercelProject.id !== target.vercelProjectId
        || issue.number !== ISSUE_9.number || issue.pull_request) throw new CloudRecoveryError("cloud_identity_mismatch");
      const databaseVars = vars.filter((variable) => variable.key === "DATABASE_URL");
      if (databaseVars.length !== 1 || databaseVars[0].gitBranch || databaseVars[0].customEnvironmentIds?.length
        || databaseVars[0].target?.slice().sort().join(",") !== "preview,production"
        || !["sensitive", "encrypted"].includes(databaseVars[0].type)) throw new CloudRecoveryError("unexpected_database_configuration");
      if (now() < CLOUD_RECOVERY_NOT_BEFORE) {
        const password = await api("neon", `/projects/${target.projectId}/branches/${target.branchId}/roles/${target.role}/reveal_password`);
        if (password.password !== decodeURIComponent(template.password)) throw new CloudRecoveryError("database_baseline_mismatch");
        if (endpoint.disabled !== true) throw new CloudRecoveryError("endpoint_not_restricted");
      }
      function checkpoint(key: string): string | undefined {
        const matching = vars.filter((variable) => variable.key === key);
        if (matching.length > 1 || matching.some((variable) => variable.gitBranch || variable.customEnvironmentIds?.length
          || variable.type !== "plain" || variable.target?.slice().sort().join(",") !== "preview,production"
          || typeof variable.value !== "string")) throw new CloudRecoveryError("ambiguous_cloud_checkpoint");
        const value = matching[0]?.value || undefined;
        if (value && (!Number.isFinite(Date.parse(value)) || Date.parse(value) < CLOUD_RECOVERY_NOT_BEFORE || Date.parse(value) > now() + 60_000)) throw new CloudRecoveryError("invalid_cloud_checkpoint");
        return value;
      }
      const completed = checkpoint("RECOVERY_COMPLETED_AT");
      const resetMarker = checkpoint("RECOVERY_RESET_STARTED_AT");
      if (completed && Date.parse(completed) <= now()
        && issue.state === "closed" && issue.state_reason === "completed") {
        report("recovery_already_completed");
        if (mode === "recover") await disableWorkflow();
        return;
      }
      report("cloud_preflight_passed");
      if (mode === "preflight") return;

      const context = await createCloudRecovery({ fetch: fetcher, now, report,
        checkpointResetStarted: (timestamp) => setVariable("RECOVERY_RESET_STARTED_AT", timestamp ?? ""),
        checkpointDatabaseUrl: async (url) => {
          dependencies.mask?.(url); dependencies.mask?.(decodeURIComponent(new URL(url).password));
          await setVariable("DATABASE_URL", url, true);
        },
        deployAndWaitReady: deploy,
      }).run({ ...config, resetStartedAt: resetMarker });

      await dependencies.validateDatabase(context);
      report("isolated_database_validation_passed");
      await dependencies.publishDatabase(context);
      report("production_migration_and_publication_verified");
      const probe = await site("/api/metrics/check", config.cronSecret, "POST", undefined, 110_000);
      if (!["checked", "isolated", "producer", "poll", "acknowledged"].every((key) => probe[key] === true)) throw new CloudRecoveryError("queue_canary_failed");
      report("queue_canary_passed_without_production_counts");
      await setVariable("TOOL_METRICS_MODE", "queue");
      await deploy();
      const drain = await site("/api/metrics/flush", config.cronSecret, "GET", undefined, 250_000);
      if (drain.enabled !== true || !["received", "acknowledged", "applied", "toolsUpdated"].every((key) => Number.isInteger(drain[key]) && Number(drain[key]) >= 0)) throw new CloudRecoveryError("queue_mode_not_active");
      report("production_queue_drain_passed");
      await site("/api/revalidate", config.revalidationSecret, "POST", { catalog: true });
      await verifyIssue9Online({ fetcher });
      report("live_publication_verified");
      await completeIssue9({ token: config.githubToken, fetcher });
      report("issue_9_replied_and_closed");
      await setVariable("RECOVERY_COMPLETED_AT", new Date(now()).toISOString());
      await disableWorkflow();
    },
  };
}

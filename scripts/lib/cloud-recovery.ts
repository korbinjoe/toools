/**
 * The recovery runner deliberately has no CLI or filesystem credential discovery.
 * Secrets enter through its caller and never form part of a report or error.
 * GitHub Actions concurrency is the outer lock; durable checkpoints protect a
 * later run when a runner disappears in the middle of the password reset.
 */
export const CLOUD_RECOVERY_TARGET = Object.freeze({
  projectId: "bitter-field-76784435",
  branchId: "br-shy-cake-akmhbjg9",
  endpointId: "ep-weathered-shape-aky91jmc",
  role: "neondb_owner",
  database: "neondb",
  hostname: "ep-weathered-shape-aky91jmc.c-3.us-west-2.aws.neon.tech",
  pooledHostname: "ep-weathered-shape-aky91jmc-pooler.c-3.us-west-2.aws.neon.tech",
  vercelProjectId: "prj_i5dVke5BWWP4MXdfRBROeTYlbvkm",
  vercelTeamId: "team_stAZrwPodmtlkANUUZ6Sy16R",
});

export const CLOUD_RECOVERY_NOT_BEFORE = Date.parse("2026-11-01T00:00:00Z");

export class CloudRecoveryError extends Error {
  constructor(readonly code: string, readonly httpStatus?: number) {
    super(code);
    this.name = "CloudRecoveryError";
  }
}

export interface CloudRecoveryCredentials {
  neonApiKey: string;
  vercelToken: string;
  /** Immutable, original exposed URL. Do not overwrite this secret checkpoint. */
  databaseUrl: string;
  /** Optional private credential checkpoint, independent of the old template. */
  recoveryDatabaseUrl?: string;
  /** A durable cloud journal value written before the non-idempotent reset POST. */
  resetStartedAt?: string;
  revalidationSecret: string;
  cronSecret: string;
}

/** Private callback context. Never log, serialize to output, or upload this. */
export interface CloudRecoveryContext {
  databaseUrl: string;
  directDatabaseUrl: string;
  rotationReused: boolean;
}

export type CloudRecoveryStage =
  | "preflight_verified"
  | "endpoint_restricted"
  | "quota_wait"
  | "credential_checkpointed"
  | "password_operations_finished"
  | "vercel_configuration_updated"
  | "deployments_ready"
  | "endpoint_enabled";

export interface CloudRecoveryDependencies {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  checkpointDatabaseUrl: (databaseUrl: string) => Promise<void>;
  checkpointResetStarted: (timestamp: string | null) => Promise<void>;
  /** Must resolve only after all required replacement deployments are READY. */
  deployAndWaitReady: (context: CloudRecoveryContext) => Promise<void>;
  report?: (stage: CloudRecoveryStage) => void;
  operationTimeoutMs?: number;
  quotaTimeoutMs?: number;
}

type Json = Record<string, unknown>;
type Operation = { id: string; status: string; branch_id?: string; endpoint_id?: string; created_at?: string };
type Environment = { id: string; key: string; target?: string[] | string; gitBranch?: string | null; customEnvironmentIds?: string[]; type?: string };

function record(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CloudRecoveryError("invalid_api_response");
  return value as Json;
}

function operations(value: unknown): Operation[] {
  if (!Array.isArray(value)) throw new CloudRecoveryError("invalid_operation_response");
  return value.map((entry) => {
    const operation = record(entry);
    if (typeof operation.id !== "string" || typeof operation.status !== "string") throw new CloudRecoveryError("invalid_operation_response");
    return operation as Operation;
  });
}

function validDatabaseUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new CloudRecoveryError("database_target_mismatch"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !new Set<string>([CLOUD_RECOVERY_TARGET.hostname, CLOUD_RECOVERY_TARGET.pooledHostname]).has(url.hostname)
    || decodeURIComponent(url.username) !== CLOUD_RECOVERY_TARGET.role
    || url.pathname !== `/${CLOUD_RECOVERY_TARGET.database}`
    || !url.password || (url.port && url.port !== "5432")) {
    throw new CloudRecoveryError("database_target_mismatch");
  }
  return url;
}

function passwordFrom(value: unknown): string {
  const body = record(value);
  const password = body.password ?? (body.role && record(body.role).password);
  if (typeof password !== "string" || password.length < 12) throw new CloudRecoveryError("missing_management_password");
  return password;
}

function quotaExceeded(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const data = value as Json;
  return [data.code, data.message, data.error, data.error && typeof data.error === "object" ? (data.error as Json).code : null,
    data.error && typeof data.error === "object" ? (data.error as Json).message : null]
    .some((item) => typeof item === "string" && /\bquota[ _-]exceeded\b/i.test(item));
}

function environmentTargets(variable: Environment): string[] {
  return (Array.isArray(variable.target) ? variable.target : [variable.target]).filter((value): value is string => typeof value === "string").sort();
}

export function createCloudRecovery(dependencies: CloudRecoveryDependencies) {
  const fetcher = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const operationTimeoutMs = dependencies.operationTimeoutMs ?? 180_000;
  const quotaTimeoutMs = dependencies.quotaTimeoutMs ?? 15 * 60_000;
  const report = (stage: CloudRecoveryStage) => dependencies.report?.(stage);

  return {
    async run(credentials: CloudRecoveryCredentials): Promise<CloudRecoveryContext> {
      if (now() < CLOUD_RECOVERY_NOT_BEFORE) throw new CloudRecoveryError("recovery_not_due");
      try {
        const originalUrl = validDatabaseUrl(credentials.databaseUrl);
        const recoveryUrl = credentials.recoveryDatabaseUrl ? validDatabaseUrl(credentials.recoveryDatabaseUrl) : null;
        if (!credentials.neonApiKey || !credentials.vercelToken
          || credentials.revalidationSecret.length < 32 || credentials.cronSecret.length < 32) {
          throw new CloudRecoveryError("missing_recovery_configuration");
        }
        let resetStartedAt = credentials.resetStartedAt;
        if (resetStartedAt && (!Number.isFinite(Date.parse(resetStartedAt)) || Date.parse(resetStartedAt) < CLOUD_RECOVERY_NOT_BEFORE || Date.parse(resetStartedAt) > now() + 60_000)) {
          throw new CloudRecoveryError("invalid_reset_checkpoint");
        }

        async function request(service: "neon" | "vercel", path: string, init: RequestInit = {}): Promise<Json> {
          const endpoint = service === "neon" ? "https://console.neon.tech/api/v2" : "https://api.vercel.com";
          const suffix = service === "vercel" ? `${path.includes("?") ? "&" : "?"}teamId=${CLOUD_RECOVERY_TARGET.vercelTeamId}` : "";
          let response: Response;
          try {
            response = await fetcher(`${endpoint}${path}${suffix}`, {
              ...init,
              headers: { Authorization: `Bearer ${service === "neon" ? credentials.neonApiKey : credentials.vercelToken}`, "Content-Type": "application/json" },
              signal: AbortSignal.timeout(30_000),
              redirect: "error",
            });
          } catch { throw new CloudRecoveryError(`${service}_request_outcome_unknown`); }
          let body: unknown;
          try { body = await response.json(); } catch { throw new CloudRecoveryError(`${service}_invalid_response`, response.status); }
          if (!response.ok) {
            if (service === "neon" && quotaExceeded(body)) throw new CloudRecoveryError("quota_exceeded", response.status);
            throw new CloudRecoveryError(response.status === 401 || response.status === 403 ? `${service}_authentication_failed` : `${service}_request_failed`, response.status);
          }
          return record(body);
        }

        const neonPath = `/projects/${CLOUD_RECOVERY_TARGET.projectId}`;
        const endpointPath = `${neonPath}/endpoints/${CLOUD_RECOVERY_TARGET.endpointId}`;
        const rolePath = `${neonPath}/branches/${CLOUD_RECOVERY_TARGET.branchId}/roles/${CLOUD_RECOVERY_TARGET.role}`;
        const environmentPath = `/v9/projects/${CLOUD_RECOVERY_TARGET.vercelProjectId}/env`;
        const createEnvironmentPath = `/v10/projects/${CLOUD_RECOVERY_TARGET.vercelProjectId}/env`;

        async function getEndpoint(): Promise<Json> {
          const endpoint = record((await request("neon", endpointPath)).endpoint);
          if (endpoint.id !== CLOUD_RECOVERY_TARGET.endpointId || endpoint.project_id !== CLOUD_RECOVERY_TARGET.projectId
            || endpoint.branch_id !== CLOUD_RECOVERY_TARGET.branchId || endpoint.host !== CLOUD_RECOVERY_TARGET.hostname) {
            throw new CloudRecoveryError("endpoint_target_mismatch");
          }
          return endpoint;
        }

        async function waitOperations(pending: Operation[]): Promise<void> {
          const deadline = now() + operationTimeoutMs;
          let current = pending;
          while (true) {
            if (current.some((item) => ["failed", "error", "cancelled"].includes(item.status))) throw new CloudRecoveryError("neon_operation_failed");
            if (current.every((item) => ["finished", "skipped"].includes(item.status))) return;
            if (now() >= deadline) throw new CloudRecoveryError("neon_operation_pending");
            await sleep(3_000);
            current = await Promise.all(current.map(async (item) => {
              const response = await request("neon", `${neonPath}/operations/${encodeURIComponent(item.id)}`);
              const operation = record(response.operation ?? response);
              if (operation.id !== item.id || typeof operation.status !== "string") throw new CloudRecoveryError("invalid_operation_response");
              return operation as Operation;
            }));
          }
        }

        async function reconcileOperations(since?: string): Promise<void> {
          let cursor: string | undefined;
          const visited = new Set<string>();
          const relevant: Operation[] = [];
          do {
            const result = await request("neon", `${neonPath}/operations?limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
            const page = operations(result.operations);
            relevant.push(...page.filter((item) => {
              const target = item.endpoint_id === CLOUD_RECOVERY_TARGET.endpointId
                || (!item.endpoint_id && item.branch_id === CLOUD_RECOVERY_TARGET.branchId);
              const recent = since && item.created_at && Date.parse(item.created_at) >= Date.parse(since) - 1000;
              return target && (recent || !["finished", "skipped", "failed", "cancelled", "error"].includes(item.status));
            }));
            const pagination = result.pagination ? record(result.pagination) : {};
            cursor = page.length && typeof pagination.cursor === "string" && pagination.cursor ? pagination.cursor : undefined;
            if (cursor && visited.has(cursor)) throw new CloudRecoveryError("invalid_operation_pagination");
            if (cursor) visited.add(cursor);
          } while (cursor);
          await waitOperations(relevant);
        }

        let endpoint = await getEndpoint();
        const listed = await request("vercel", environmentPath);
        if (!Array.isArray(listed.envs)) throw new CloudRecoveryError("invalid_vercel_environment_response");
        const variables = listed.envs.map((item) => record(item) as Environment);
        const databaseVariables = variables.filter((item) => item.key === "DATABASE_URL");
        if (databaseVariables.length !== 1 || databaseVariables[0].gitBranch
          || databaseVariables[0].customEnvironmentIds?.length
          || environmentTargets(databaseVariables[0]).join(",") !== "preview,production"
          || !["sensitive", "encrypted"].includes(databaseVariables[0].type ?? "")) {
          throw new CloudRecoveryError("unexpected_database_environment_scope");
        }
        // Reject conflicting branch-specific variables before the first reset.
        for (const key of ["REVALIDATION_SECRET", "CRON_SECRET", "TOOL_METRICS_MODE"]) {
          const matching = variables.filter((item) => item.key === key);
          if (matching.some((item) => item.gitBranch || item.customEnvironmentIds?.length)
            || matching.some((item) => environmentTargets(item).some((target) => !["production", "preview", "development"].includes(target)))) {
            throw new CloudRecoveryError("unexpected_recovery_environment_scope");
          }
          if (key !== "TOOL_METRICS_MODE" && matching.some((item) => environmentTargets(item).some((target) => ["production", "preview"].includes(target))
            && !["sensitive", "encrypted"].includes(item.type ?? ""))) throw new CloudRecoveryError("unprotected_recovery_environment");
        }
        report("preflight_verified");
        if (endpoint.disabled !== true || endpoint.autoscaling_limit_min_cu !== 0.25
          || endpoint.autoscaling_limit_max_cu !== 0.25 || ![0, 300].includes(Number(endpoint.suspend_timeout_seconds))) {
          const quotaDeadline = now() + quotaTimeoutMs;
          while (true) {
            try {
              const restricted = await request("neon", endpointPath, { method: "PATCH", body: JSON.stringify({ endpoint: {
                disabled: true, autoscaling_limit_min_cu: 0.25, autoscaling_limit_max_cu: 0.25,
                // Free's default is five minutes; it cannot set a custom timeout.
                suspend_timeout_seconds: 0,
              } }) });
              await waitOperations(operations(restricted.operations));
              break;
            } catch (error) {
              if (!(error instanceof CloudRecoveryError) || error.code !== "quota_exceeded" || now() >= quotaDeadline) throw error;
              report("quota_wait");
              await sleep(Math.min(60_000, quotaDeadline - now()));
            }
          }
          endpoint = await getEndpoint();
          if (endpoint.disabled !== true || endpoint.autoscaling_limit_min_cu !== 0.25
            || endpoint.autoscaling_limit_max_cu !== 0.25 || ![0, 300].includes(Number(endpoint.suspend_timeout_seconds))) {
            throw new CloudRecoveryError("endpoint_restriction_failed");
          }
        }
        report("endpoint_restricted");

        const recoveryWindowStart = new Date(CLOUD_RECOVERY_NOT_BEFORE).toISOString();
        await reconcileOperations(resetStartedAt ?? recoveryWindowStart);
        let password = passwordFrom(await request("neon", `${rolePath}/reveal_password`));
        const oldPassword = decodeURIComponent(originalUrl.password);
        let rotationReused = password !== oldPassword;
        if (recoveryUrl && decodeURIComponent(recoveryUrl.password) !== password) throw new CloudRecoveryError("recovery_checkpoint_password_mismatch");
        if (recoveryUrl && password === oldPassword) throw new CloudRecoveryError("recovery_checkpoint_not_rotated");
        if (password === oldPassword) {
          if (resetStartedAt) throw new CloudRecoveryError("reset_outcome_unknown");
          const quotaDeadline = now() + quotaTimeoutMs;
          while (true) {
            resetStartedAt = new Date(now()).toISOString();
            try { await dependencies.checkpointResetStarted(resetStartedAt); }
            catch { throw new CloudRecoveryError("reset_checkpoint_failed"); }
            try {
              const response = await request("neon", `${rolePath}/reset_password`, { method: "POST" });
              password = passwordFrom(response);
              if (password === oldPassword) throw new CloudRecoveryError("password_not_rotated");
              // Persist the credential before waiting for asynchronous operations.
              const replacement = new URL(originalUrl);
              replacement.password = password;
              try { await dependencies.checkpointDatabaseUrl(replacement.toString()); }
              catch { throw new CloudRecoveryError("credential_checkpoint_failed"); }
              report("credential_checkpointed");
              await waitOperations(operations(response.operations));
              break;
            } catch (error) {
              if (error instanceof CloudRecoveryError && error.code === "quota_exceeded") {
                try { await dependencies.checkpointResetStarted(null); }
                catch { throw new CloudRecoveryError("reset_checkpoint_failed"); }
                resetStartedAt = undefined;
                if (now() >= quotaDeadline) throw error;
                report("quota_wait");
                await sleep(Math.min(60_000, quotaDeadline - now()));
                continue;
              }
              // Never blindly retry a reset. A dropped response may already have
              // changed the control-plane password; recover it through read APIs.
              if (error instanceof CloudRecoveryError && ["credential_checkpoint_failed", "neon_operation_failed", "neon_operation_pending"].includes(error.code)) throw error;
              if (error instanceof CloudRecoveryError && error.code === "neon_authentication_failed") {
                try { await dependencies.checkpointResetStarted(null); }
                catch { throw new CloudRecoveryError("reset_checkpoint_failed"); }
                throw error;
              }
              await reconcileOperations(resetStartedAt);
              password = passwordFrom(await request("neon", `${rolePath}/reveal_password`));
              if (password === oldPassword) throw new CloudRecoveryError("reset_outcome_unknown");
              rotationReused = true;
              break;
            }
          }
        }

        const replacement = new URL(originalUrl);
        replacement.password = password;
        const context: CloudRecoveryContext = {
          databaseUrl: replacement.toString(),
          directDatabaseUrl: (() => { const direct = new URL(replacement); direct.hostname = CLOUD_RECOVERY_TARGET.hostname; return direct.toString(); })(),
          rotationReused,
        };
        // Safe to repeat a secret update; a lost acknowledgement does not reset
        // the role again because the original exposed template stays immutable.
        try { await dependencies.checkpointDatabaseUrl(context.databaseUrl); }
        catch { throw new CloudRecoveryError("credential_checkpoint_failed"); }
        report("credential_checkpointed");
        await reconcileOperations(resetStartedAt ?? recoveryWindowStart);
        if (passwordFrom(await request("neon", `${rolePath}/reveal_password`)) !== password) throw new CloudRecoveryError("management_password_changed");
        report("password_operations_finished");

        async function updateEnvironment(key: string, value: string, secret: boolean): Promise<void> {
          const matching = variables.filter((item) => item.key === key);
          const covered = new Set<string>();
          for (const variable of matching) {
            const targets = environmentTargets(variable);
            if (!targets.some((target) => target === "production" || target === "preview")) continue;
            const result = await request("vercel", `${environmentPath}/${encodeURIComponent(variable.id)}`, {
              // Preserve existing scopes and encryption settings, including
              // encrypted values which also target development.
              method: "PATCH", body: JSON.stringify({ value }),
            });
            if (result.id !== variable.id || result.key !== key) throw new CloudRecoveryError("vercel_environment_update_mismatch");
            for (const target of targets) covered.add(target);
          }
          const missing = ["production", "preview"].filter((target) => !covered.has(target));
          if (missing.length) {
            const result = await request("vercel", createEnvironmentPath, {
              method: "POST", body: JSON.stringify({ key, value, target: missing, type: secret ? "sensitive" : "plain" }),
            });
            if (!Array.isArray(result.failed) || result.failed.length) throw new CloudRecoveryError("vercel_environment_create_failed");
            const created = record(result.created);
            if (created.key !== key || typeof created.id !== "string"
              || environmentTargets(created as Environment).join(",") !== [...missing].sort().join(",")) {
              throw new CloudRecoveryError("vercel_environment_create_mismatch");
            }
          }
        }
        await updateEnvironment("DATABASE_URL", context.databaseUrl, true);
        await updateEnvironment("REVALIDATION_SECRET", credentials.revalidationSecret, true);
        await updateEnvironment("CRON_SECRET", credentials.cronSecret, true);
        // The new consumer must not run before its migration and validation.
        await updateEnvironment("TOOL_METRICS_MODE", "direct", false);
        report("vercel_configuration_updated");
        try { await dependencies.deployAndWaitReady(context); }
        catch { throw new CloudRecoveryError("replacement_deployment_failed"); }
        report("deployments_ready");
        if (passwordFrom(await request("neon", `${rolePath}/reveal_password`)) !== password) throw new CloudRecoveryError("management_password_changed");
        endpoint = await getEndpoint();
        if (endpoint.disabled !== true) throw new CloudRecoveryError("endpoint_restriction_changed");
        const enabled = await request("neon", endpointPath, { method: "PATCH", body: JSON.stringify({ endpoint: { disabled: false } }) });
        await waitOperations(operations(enabled.operations));
        if ((await getEndpoint()).disabled !== false) throw new CloudRecoveryError("endpoint_enable_failed");
        report("endpoint_enabled");
        return context;
      } catch (error) {
        if (error instanceof CloudRecoveryError) throw error;
        throw new CloudRecoveryError("cloud_recovery_failed");
      }
    },
  };
}

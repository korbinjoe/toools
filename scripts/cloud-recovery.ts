import { createCloudWorkflow } from "./lib/cloud-workflow";
import { CloudDatabaseError, createCloudDatabase } from "./lib/cloud-database";
import { CloudRecoveryError } from "./lib/cloud-recovery";

async function main() {
  const env = process.env;
  const database = createCloudDatabase({ report: (stage) => console.log(stage) });
  const branchName = `recovery-validation-actions-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`;
  if (process.argv.includes("--cleanup")) {
    if (Date.now() < Date.parse("2026-11-01T00:00:00Z")) return;
    await database.cleanupTemporaryBranch({ neonApiKey: env.CLOUD_NEON_API_KEY ?? "", branchName });
    return;
  }
  const mode = process.argv[process.argv.indexOf("--mode") + 1];
  if (!["preflight", "recover"].includes(mode)) throw new CloudRecoveryError("invalid_recovery_mode");
  await createCloudWorkflow({
    neonApiKey: env.CLOUD_NEON_API_KEY ?? "", vercelToken: env.CLOUD_VERCEL_TOKEN ?? "",
    databaseUrl: env.CLOUD_DATABASE_TEMPLATE ?? "", revalidationSecret: env.REVALIDATION_SECRET ?? "", cronSecret: env.CRON_SECRET ?? "",
    githubToken: env.GITHUB_TOKEN ?? "", sha: env.GITHUB_SHA ?? "", repository: env.GITHUB_REPOSITORY ?? "", ref: env.GITHUB_REF ?? "",
  }, {
    report: (stage) => console.log(stage),
    mask: (value) => { if (env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`); },
    validateDatabase: (context) => database.validateOnTemporaryBranch({ databaseUrl: context.directDatabaseUrl, neonApiKey: env.CLOUD_NEON_API_KEY ?? "", branchName }),
    publishDatabase: async (context) => { await database.migrateAndPublishProduction({ databaseUrl: context.directDatabaseUrl }); },
  }).run(mode as "preflight" | "recover");
}

main().catch((error: unknown) => {
  // Raw network/SQL/CLI errors can contain connection strings. Only stable safe
  // error codes are emitted; failures remain visible in the Actions run status.
  console.error(error instanceof CloudRecoveryError || error instanceof CloudDatabaseError ? error.code : "cloud_recovery_step_failed");
  process.exitCode = 1;
});

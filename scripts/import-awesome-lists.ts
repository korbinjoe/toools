// Compatibility entry point: all configured Markdown/JSON directories now use
// the shared importer, with additive provenance and mandatory PENDING status.
// Accepts the same --dry-run/--config/--limit/--report options as import:github.
process.argv.push('--mode', 'directories');
import('./import-github').catch((error) => {
  console.error(error instanceof Error ? error.message : 'Directory import failed');
  process.exitCode = 1;
});

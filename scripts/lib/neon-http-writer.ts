import { neon, NeonDbError } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { type ImportCandidate } from './import-store';
import { getGoogleFaviconUrl } from './favicon';
import { canonicalRepoUrl } from './import-identity';

// The helper exists only in this request's temporary schema. Its reads and
// writes run under the same advisory lock as the normal PostgreSQL importer.
export const IMPORT_FUNCTION_SQL = readFileSync('scripts/sql/import-candidate.sql', 'utf8');

export function httpImportPayload(candidate: ImportCandidate, keys: string[], legacyIds: string[], currentKeys: string[], categoryId: string, baseSlug: string) {
  return { ...candidate, keys, legacyIds, currentKeys, categoryId, baseSlug, canonicalRepo: canonicalRepoUrl(candidate.github || candidate.url), iconUrl: getGoogleFaviconUrl(candidate.url), newId: randomUUID(), discoveryId: randomUUID() };
}

export class IndeterminateWriteError extends Error {
  constructor() {
    super('Database write outcome is indeterminate after network retries; stop and reconcile database counts before resuming');
    this.name = 'IndeterminateWriteError';
  }
}

export function definiteDatabaseRejection(error: unknown) {
  return error instanceof NeonDbError && Boolean(error.code && /^[0-9A-Z]{5}$/.test(error.code)
    && !error.code.startsWith('08') && !['40003', '57P01', '57P02'].includes(error.code)
    && !['FATAL', 'PANIC'].includes(error.severity || ''));
}

export class NeonHttpWriter {
  private sql;
  constructor(connectionString: string) {
    if (!new URL(connectionString).hostname.endsWith('.neon.tech')) throw new Error('neon-http transport requires a Neon database');
    this.sql = neon(connectionString);
  }

  async persist(candidate: ImportCandidate, keys: string[], legacyIds: string[], currentKeys: string[], categoryId: string, baseSlug: string) {
    const payload = httpImportPayload(candidate, keys, legacyIds, currentKeys, categoryId, baseSlug);
    type Saved = {
      tool: { id: string; slug: string; url: string; github: string | null; source: ImportCandidate['discovery']['source'] | null; sourceUrl: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'; githubStars: number | null; phVotes: number | null; identities: { key: string }[] };
      keys: string[]; created: boolean;
    };
    // Reuse the same operation UUID on retries. The SQL helper recognizes a
    // previous creation by that UUID, so an acknowledged retry still counts
    // exactly one new tool after a lost commit response.
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await this.sql.transaction([
          this.sql.query(IMPORT_FUNCTION_SQL),
          this.sql.query('SELECT pg_temp.toools_import_candidate($1::jsonb) AS result', [JSON.stringify(payload)]),
          this.sql.query('DROP FUNCTION pg_temp.toools_import_candidate(jsonb)'),
        ]);
        return result[1][0].result as Saved;
      } catch (error) {
        if (definiteDatabaseRejection(error)) {
          if (attempt === 0) throw error;
          throw new IndeterminateWriteError();
        }
        if (attempt >= 3) throw new IndeterminateWriteError();
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
}

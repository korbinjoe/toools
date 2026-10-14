import { parseArgs } from 'node:util';
import { type ImportMode } from './github-import';

export function parseImportOptions(args: string[]) {
  const { values } = parseArgs({ args, options: {
    config: { type: 'string', default: 'scripts/config/github-sources.json' },
    mode: { type: 'string', default: 'all' },
    limit: { type: 'string', default: '10000' },
    'new-limit': { type: 'string' },
    transport: { type: 'string', default: 'pg' },
    'max-per-source': { type: 'string', default: '100' },
    'dry-run': { type: 'boolean', default: false },
    report: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  } });
  const positive = (value: string, name: string, max: number) => {
    if (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw new Error(`${name} must be an integer between 1 and ${max}`);
    return Number(value);
  };
  if (!['all', 'topics', 'keywords', 'organizations', 'directories'].includes(values.mode)) throw new Error('Unknown mode; use all, topics, keywords, organizations, or directories');
  if (!['pg', 'neon-http'].includes(values.transport)) throw new Error('Transport must be pg or neon-http');
  return { config: values.config, mode: values.mode as ImportMode, transport: values.transport, limit: positive(values.limit, '--limit', 100000), newLimit: values['new-limit'] !== undefined ? positive(values['new-limit'], '--new-limit', 100000) : undefined, maxPerSource: positive(values['max-per-source'], '--max-per-source', 1000), dryRun: values['dry-run'], report: values.report, help: values.help };
}

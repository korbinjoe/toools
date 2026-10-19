import { type PrismaClient, type Prisma, type ToolSource, type ToolStatus, type Pricing } from '@prisma/client';
import { matchCategory } from './category-matcher';
import { generateSlug } from './dedup';
import { getGoogleFaviconUrl } from './favicon';
import { identityKeys, canonicalRepoUrl, publicHttpUrl } from './import-identity';
import { IndeterminateWriteError, type NeonHttpWriter } from './neon-http-writer';
import { databaseRead } from './database-read';
import { CatalogPublication } from './catalog-publication';

export interface ImportCandidate {
  name: string;
  url: string;
  description: string;
  tagline?: string;
  categoryHints: string[];
  categorySlug?: string;
  github?: string | null;
  repositoryId?: string;
  githubStars?: number;
  phVotes?: number;
  isOpenSource?: boolean;
  pricing?: Pricing;
  platforms?: string[];
  featured?: boolean;
  discovery: {
    source: ToolSource;
    method: string;
    sourceKey: string;
    sourceUrl: string;
    metadata?: Prisma.InputJsonObject;
  };
}

type ExistingTool = {
  id: string; slug: string; url: string; github: string | null;
  source: ToolSource | null; sourceUrl: string | null; status: ToolStatus;
  githubStars: number | null; phVotes: number | null;
  identities: { key: string }[];
};
export type ImportResult = { action: 'created' | 'updated'; toolId: string; slug: string; status: ToolStatus; dryRun: boolean };

function publicToolMayChange(candidate: ImportCandidate, tool: ExistingTool) {
  return tool.status === 'APPROVED' && (
    (!tool.github && Boolean(candidate.github)) || !tool.source
    || (candidate.githubStars !== undefined && candidate.githubStars !== tool.githubStars)
    || (candidate.phVotes !== undefined && Math.max(tool.phVotes ?? 0, candidate.phVotes) !== tool.phVotes)
  );
}

export class ImportStore {
  private index = new Map<string, Set<string>>();
  private tools = new Map<string, ExistingTool>();
  private slugs = new Set<string>();

  constructor(private prisma?: PrismaClient, private categories: Map<string, string> = new Map(), existing: ExistingTool[] = [], private httpWriter?: Pick<NeonHttpWriter, 'persist'>, readonly publication = new CatalogPublication()) {
    for (const tool of existing) this.remember(tool, [...this.keysForExisting(tool), ...tool.identities.map((i) => i.key)]);
  }

  static async connect(prisma: PrismaClient, httpWriter?: Pick<NeonHttpWriter, 'persist'>, publication = new CatalogPublication()) {
    const tools: ExistingTool[] = [];
    let cursor: string | undefined;
    do {
      const page: ExistingTool[] = await databaseRead(() => prisma.tool.findMany({
        select: { id: true, slug: true, url: true, github: true, source: true, sourceUrl: true, status: true, githubStars: true, phVotes: true, identities: { select: { key: true } } },
        orderBy: { id: 'asc' }, take: 250, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }));
      tools.push(...page);
      cursor = page.length === 250 ? page[page.length - 1].id : undefined;
    } while (cursor);
    const categories = await databaseRead(() => prisma.category.findMany({ select: { id: true, slug: true } }));
    return new ImportStore(prisma, new Map(categories.map((c) => [c.slug, c.id])), tools, httpWriter, publication);
  }

  private keysForExisting(tool: ExistingTool) {
    try { return identityKeys(tool); } catch { return []; }
  }

  private remember(tool: ExistingTool, keys: string[]) {
    this.tools.set(tool.id, tool);
    this.slugs.add(tool.slug);
    for (const key of keys) {
      const ids = this.index.get(key) ?? new Set<string>();
      ids.add(tool.id);
      this.index.set(key, ids);
    }
  }

  private matchingIds(keys: string[]) {
    return new Set(keys.flatMap((key) => [...(this.index.get(key) ?? [])]));
  }

  private checkRepositoryConflict(candidate: ImportCandidate, tool: ExistingTool, knownKeys: string[]) {
    const incomingRepo = canonicalRepoUrl(candidate.github || candidate.url);
    const existingRepo = tool.github && canonicalRepoUrl(tool.github);
    const existingIds = knownKeys.filter((key) => key.startsWith('github-id:'));
    if (candidate.repositoryId && existingIds.some((key) => key !== `github-id:${candidate.repositoryId}`)) {
      throw new Error('Identity conflict: different repositories share this website; review before merging');
    }
    if (incomingRepo && existingRepo && incomingRepo !== existingRepo &&
        !(candidate.repositoryId && existingIds.includes(`github-id:${candidate.repositoryId}`))) {
      throw new Error('Identity conflict: website matches a different GitHub repository');
    }
  }

  async ingest(candidate: ImportCandidate): Promise<ImportResult> {
    if (!candidate.name.trim() || !publicHttpUrl(candidate.url) || !publicHttpUrl(candidate.discovery.sourceUrl)) throw new Error('Invalid tool name, URL, or source URL');
    if (candidate.github && !canonicalRepoUrl(candidate.github)) throw new Error('GitHub identity must be a repository root URL');
    for (const count of [candidate.githubStars, candidate.phVotes]) {
      if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) throw new Error('Popularity counts must be nonnegative integers');
    }
    const keys = identityKeys(candidate);
    const categorySlug = candidate.categorySlug || matchCategory(candidate.categoryHints);
    const categoryId = this.categories.get(categorySlug);
    if (this.prisma && !categoryId) throw new Error(`Category ${categorySlug} is missing; seed categories before importing`);
    const baseSlug = generateSlug(candidate.name) || 'tool';

    if (!this.prisma) {
      const ids = this.matchingIds(keys);
      if (ids.size > 1) throw new Error('Identity conflict: candidate matches multiple existing tools');
      const existing = ids.size ? this.tools.get([...ids][0]) : undefined;
      if (existing) this.checkRepositoryConflict(candidate, existing, [...existing.identities.map((i) => i.key), ...this.keysForExisting(existing)]);
      let slug = existing?.slug || baseSlug;
      for (let suffix = 2; !existing && this.slugs.has(slug); suffix++) slug = `${baseSlug}-${suffix}`;
      const tool: ExistingTool = existing || { id: `dry-run-${this.tools.size + 1}`, slug, url: candidate.url, github: candidate.github || null, source: candidate.discovery.source, sourceUrl: candidate.discovery.sourceUrl, status: 'PENDING', githubStars: candidate.githubStars ?? null, phVotes: candidate.phVotes ?? null, identities: [] };
      tool.identities = [...new Set([...tool.identities.map((i) => i.key), ...keys])].map((key) => ({ key }));
      this.remember(tool, keys);
      return { action: existing ? 'updated' : 'created', toolId: tool.id, slug: tool.slug, status: tool.status, dryRun: true };
    }

    if (this.httpWriter) {
      const legacyIds = [...this.matchingIds(keys)];
      const mayChangePublic = legacyIds.some((id) => {
        const tool = this.tools.get(id);
        return tool ? publicToolMayChange(candidate, tool) : false;
      });
      if (mayChangePublic) this.publication.prepare();
      const allowPublicWrite = mayChangePublic || this.publication.canWritePublic();
      const currentKeys = legacyIds.flatMap((id) => this.tools.get(id) ? this.keysForExisting(this.tools.get(id)!) : []);
      const normalized = { ...candidate, ...(candidate.github ? { github: canonicalRepoUrl(candidate.github) } : {}) };
      let saved: Awaited<ReturnType<NeonHttpWriter['persist']>>;
      try {
        saved = await this.httpWriter.persist(normalized, keys, legacyIds, currentKeys, categoryId!, baseSlug, allowPublicWrite);
      } catch (error) {
        // A lost acknowledgement may have committed the intended public edit.
        if (allowPublicWrite && error instanceof IndeterminateWriteError) this.publication.markChanged();
        throw error;
      }
      this.remember(saved.tool, saved.keys);
      if (saved.tool.status === 'APPROVED' && saved.publicChanged !== false) this.publication.markChanged();
      return { action: saved.created ? 'created' : 'updated', toolId: saved.tool.id, slug: saved.tool.slug, status: saved.tool.status, dryRun: false };
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      // Serialize importer identity claims across processes, including slug
      // allocation and the tool+aliases+provenance write. Never merge on races.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1378392541)`;
      const aliases = await tx.toolIdentity.findMany({ where: { key: { in: keys } } });
      const ids = this.matchingIds(keys);
      for (const alias of aliases) ids.add(alias.toolId);
      if (ids.size > 1) throw new Error('Identity conflict: candidate matches multiple existing tools');
      const existingId = [...ids][0];
      const existing = existingId ? await tx.tool.findUniqueOrThrow({ where: { id: existingId }, include: { identities: { select: { key: true } } } }) : null;
      if (existing) this.checkRepositoryConflict(candidate, existing, existing.identities.map((i) => i.key));
      let slug = existing?.slug || baseSlug;
      for (let suffix = 2; !existing && (this.slugs.has(slug) || await tx.tool.findUnique({ where: { slug }, select: { id: true } })); suffix++) slug = `${baseSlug}-${suffix}`;
      const changes: Prisma.ToolUpdateInput = {};
      if (existing) {
        if (!existing.github && candidate.github) changes.github = canonicalRepoUrl(candidate.github);
        if (candidate.githubStars !== undefined && candidate.githubStars !== existing.githubStars) changes.githubStars = candidate.githubStars;
        if (candidate.phVotes !== undefined) {
          const highestObservedVotes = Math.max(existing.phVotes ?? 0, candidate.phVotes);
          if (highestObservedVotes !== existing.phVotes) changes.phVotes = highestObservedVotes;
        }
        if (!existing.source) { changes.source = candidate.discovery.source; changes.sourceUrl = candidate.discovery.sourceUrl; }
      }
      const publicChanged = existing?.status === 'APPROVED' && Object.keys(changes).length > 0;
      if (publicChanged) this.publication.prepare();
      const tool = existing ? Object.keys(changes).length ? await tx.tool.update({ where: { id: existing.id }, data: changes }) : existing : await tx.tool.create({ data: {
        name: candidate.name.trim().slice(0, 100), slug,
        tagline: (candidate.tagline || candidate.description || candidate.name).slice(0, 200),
        description: candidate.description || candidate.name,
        url: candidate.url, iconUrl: getGoogleFaviconUrl(candidate.url), categoryId: categoryId!,
        github: candidate.github ? canonicalRepoUrl(candidate.github) : null,
        githubStars: candidate.githubStars, phVotes: candidate.phVotes,
        isOpenSource: candidate.isOpenSource ?? false, pricing: candidate.pricing ?? 'FREEMIUM',
        platforms: candidate.platforms ?? [], featured: candidate.featured ?? false,
        status: 'PENDING', source: candidate.discovery.source, sourceUrl: candidate.discovery.sourceUrl,
      } });
      const allKeys = [...new Set([...keys, ...identityKeys(tool)])];
      for (const key of allKeys) {
        const alias = await tx.toolIdentity.upsert({ where: { key }, update: {}, create: { key, toolId: tool.id } });
        if (alias.toolId !== tool.id) throw new Error('Identity conflict while claiming aliases');
      }
      const discovery = candidate.discovery;
      const metadata: Prisma.InputJsonObject = { ...discovery.metadata, ...(candidate.phVotes !== undefined ? { phVotes: candidate.phVotes } : {}), ...(candidate.githubStars !== undefined ? { githubStars: candidate.githubStars } : {}) };
      const seenAt = new Date();
      await tx.toolDiscovery.upsert({
        where: { toolId_source_method_sourceKey: { toolId: tool.id, source: discovery.source, method: discovery.method, sourceKey: discovery.sourceKey } },
        create: { toolId: tool.id, ...discovery, metadata, firstSeenAt: seenAt, lastSeenAt: seenAt },
        update: { sourceUrl: discovery.sourceUrl, metadata, lastSeenAt: seenAt },
      });
      return { tool: { ...tool, identities: allKeys.map((key) => ({ key })) }, keys: allKeys, created: !existing, publicChanged };
    }, { timeout: 30_000 });
    this.remember(saved.tool, saved.keys);
    if (saved.publicChanged) this.publication.markChanged();
    return { action: saved.created ? 'created' : 'updated', toolId: saved.tool.id, slug: saved.tool.slug, status: saved.tool.status, dryRun: false };
  }
}

CREATE OR REPLACE FUNCTION pg_temp.toools_import_candidate(p JSONB)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $function$
DECLARE
  ids TEXT[];
  keys TEXT[];
  t "Tool"%ROWTYPE;
  existing_ids TEXT[];
  repo TEXT;
  existing_repo TEXT;
  is_new BOOLEAN;
  chosen_slug TEXT;
  suffix INTEGER := 2;
  alias_owner TEXT;
  alias_key TEXT;
  metadata JSONB;
  seen TIMESTAMP(3) := clock_timestamp();
BEGIN
  PERFORM pg_advisory_xact_lock(1378392541);
  seen := clock_timestamp();
  SELECT array_agg(value) INTO keys FROM jsonb_array_elements_text(p->'keys');
  SELECT array_agg(DISTINCT id) INTO ids FROM (
    SELECT "toolId" AS id FROM "ToolIdentity" WHERE key = ANY(keys)
    UNION SELECT id FROM "Tool" WHERE id IN (SELECT jsonb_array_elements_text(p->'legacyIds'))
  ) matches;
  IF cardinality(ids) > 1 THEN
    RAISE EXCEPTION 'Identity conflict: candidate matches multiple existing tools';
  END IF;
  is_new := COALESCE(cardinality(ids), 0) = 0;
  IF NOT is_new THEN
    SELECT * INTO STRICT t FROM "Tool" WHERE id = ids[1];
    SELECT array_agg(key) INTO existing_ids FROM "ToolIdentity"
      WHERE "toolId" = t.id AND key LIKE 'github-id:%';
    IF p->>'repositoryId' IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(existing_ids) k WHERE k <> 'github-id:' || (p->>'repositoryId')
    ) THEN
      RAISE EXCEPTION 'Identity conflict: different repositories share this website; review before merging';
    END IF;
    repo := p->>'canonicalRepo';
    existing_repo := regexp_replace(lower(regexp_replace(t.github, '^\s+|\s+$', '', 'g')), '[?#].*$', '');
    IF existing_repo ~ '^https?://(www\.)?github\.com(:[0-9]+)?/' THEN
      existing_repo := regexp_replace(existing_repo, '^https?://(www\.)?github\.com(:[0-9]+)?/', '');
      existing_repo := regexp_replace(trim(BOTH '/' FROM existing_repo), '/+', '/', 'g');
      existing_repo := 'https://github.com/' || regexp_replace(existing_repo, '\.git$', '');
    ELSE
      existing_repo := NULL;
    END IF;
    IF repo IS NOT NULL AND existing_repo ~ '^https://github\.com/[a-z0-9-]+/[a-z0-9_.-]+$'
      AND repo <> existing_repo AND NOT COALESCE(('github-id:' || (p->>'repositoryId')) = ANY(existing_ids), false) THEN
      RAISE EXCEPTION 'Identity conflict: website matches a different GitHub repository';
    END IF;
    UPDATE "Tool" SET
      github = COALESCE(github, p->>'github'),
      "githubStars" = COALESCE((p->>'githubStars')::INTEGER, "githubStars"),
      "phVotes" = CASE WHEN p ? 'phVotes' THEN GREATEST(COALESCE("phVotes", 0), (p->>'phVotes')::INTEGER) ELSE "phVotes" END,
      source = COALESCE(source, (p->'discovery'->>'source')::"ToolSource"),
      "sourceUrl" = CASE WHEN source IS NULL THEN p->'discovery'->>'sourceUrl' ELSE "sourceUrl" END,
      "updatedAt" = seen
    WHERE id = t.id AND (
      (github IS NULL AND p->>'github' IS NOT NULL)
      OR (p ? 'githubStars' AND "githubStars" IS DISTINCT FROM (p->>'githubStars')::INTEGER)
      OR (p ? 'phVotes' AND "phVotes" IS DISTINCT FROM GREATEST(COALESCE("phVotes", 0), (p->>'phVotes')::INTEGER))
      OR source IS NULL
    );
    SELECT * INTO STRICT t FROM "Tool" WHERE id = t.id;
  ELSE
    chosen_slug := p->>'baseSlug';
    WHILE EXISTS (SELECT 1 FROM "Tool" WHERE slug = chosen_slug) LOOP
      chosen_slug := (p->>'baseSlug') || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    INSERT INTO "Tool" (
      id, name, slug, tagline, description, url, "iconUrl", "categoryId", github,
      "githubStars", "phVotes", "isOpenSource", pricing, platforms, featured,
      status, source, "sourceUrl", "createdAt", "updatedAt"
    ) VALUES (
      p->>'newId', left(trim(p->>'name'),100), chosen_slug,
      left(COALESCE(NULLIF(p->>'tagline',''), NULLIF(p->>'description',''), p->>'name'),200),
      COALESCE(NULLIF(p->>'description',''),p->>'name'), p->>'url', p->>'iconUrl', p->>'categoryId', p->>'github',
      (p->>'githubStars')::INTEGER, (p->>'phVotes')::INTEGER, COALESCE((p->>'isOpenSource')::BOOLEAN,false),
      COALESCE(p->>'pricing','FREEMIUM')::"Pricing",
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p->'platforms','[]'::jsonb))),
      COALESCE((p->>'featured')::BOOLEAN,false), 'PENDING',
      (p->'discovery'->>'source')::"ToolSource", p->'discovery'->>'sourceUrl', seen, seen
    ) RETURNING * INTO t;
  END IF;
  -- Retain the current tool's aliases along with newly discovered aliases.
  SELECT array_agg(DISTINCT k) INTO keys FROM (
    SELECT unnest(keys) k UNION SELECT jsonb_array_elements_text(p->'currentKeys')
  ) all_keys;
  FOREACH alias_key IN ARRAY keys LOOP
    INSERT INTO "ToolIdentity" (key,"toolId") VALUES (alias_key,t.id)
      ON CONFLICT (key) DO NOTHING;
    SELECT "toolId" INTO alias_owner FROM "ToolIdentity" WHERE key=alias_key;
    IF alias_owner <> t.id THEN RAISE EXCEPTION 'Identity conflict while claiming aliases'; END IF;
  END LOOP;
  metadata := COALESCE(p->'discovery'->'metadata','{}'::jsonb)
    || CASE WHEN p ? 'phVotes' THEN jsonb_build_object('phVotes',p->'phVotes') ELSE '{}'::jsonb END
    || CASE WHEN p ? 'githubStars' THEN jsonb_build_object('githubStars',p->'githubStars') ELSE '{}'::jsonb END;
  INSERT INTO "ToolDiscovery" (id,"toolId",source,method,"sourceKey","sourceUrl",metadata,"firstSeenAt","lastSeenAt")
  VALUES (p->>'discoveryId',t.id,(p->'discovery'->>'source')::"ToolSource",
    p->'discovery'->>'method',p->'discovery'->>'sourceKey',p->'discovery'->>'sourceUrl',metadata,seen,seen)
  ON CONFLICT ("toolId",source,method,"sourceKey") DO UPDATE SET
    "sourceUrl"=EXCLUDED."sourceUrl",metadata=EXCLUDED.metadata,"lastSeenAt"=EXCLUDED."lastSeenAt";
  RETURN jsonb_build_object('tool',to_jsonb(t)||jsonb_build_object('identities',
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('key',key)),'[]'::jsonb) FROM "ToolIdentity" WHERE "toolId"=t.id)),
    'keys',to_jsonb(keys),'created',is_new OR t.id = p->>'newId');
END;
$function$;

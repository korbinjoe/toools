-- Publish the submission from GitHub issue #9 to the live catalog.
-- Details checked against https://www.mangatranslate.com/ on 2026-10-19.
-- Pricing is on /#pricing; the submitted /pricing URL returns 404.
-- Run only after the production database quota has been restored.
-- Safe to rerun; retains engagement counts and existing primary provenance.

BEGIN;

-- Coordinate identity claims with the GitHub import pipeline.
SELECT pg_advisory_xact_lock(1378392541);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'image-media') THEN
    RAISE EXCEPTION 'Required Image & Media category is missing';
  END IF;
  IF (SELECT count(*) FROM "Tag" WHERE slug IN ('ai', 'image-editing')) <> 2 THEN
    RAISE EXCEPTION 'Required AI or Image Editing tag is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Tool"
    WHERE slug = 'mangatranslate'
      AND lower(url) !~ '^https?://(www\.)?mangatranslate\.com(:80|:443)?/*([?#].*)?$'
  ) THEN
    RAISE EXCEPTION 'MangaTranslate slug belongs to another website; reconcile before publication';
  END IF;
  IF EXISTS (
    -- Include root-page query/fragment variants even on legacy records without aliases.
    SELECT 1 FROM "Tool"
    WHERE lower(url) ~ '^https?://(www\.)?mangatranslate\.com(:80|:443)?/*([?#].*)?$'
      AND slug <> 'mangatranslate'
  ) OR EXISTS (
    SELECT 1 FROM "ToolIdentity" i JOIN "Tool" t ON t.id = i."toolId"
    WHERE i.key = 'url:mangatranslate.com' AND t.slug <> 'mangatranslate'
  ) THEN
    RAISE EXCEPTION 'MangaTranslate already exists under another slug; reconcile before publication';
  END IF;
END $$;

INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "isOpenSource", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'MangaTranslate',
  'mangatranslate',
  'Translate manga images and PDFs with OCR and an online layout editor',
  'MangaTranslate is a cloud-based tool for translating manga, comic images, and PDFs. It combines OCR, translation, and typesetting with batch uploads and an online editor for reviewing dialogue, fonts, and layout. Limited daily free credits are available alongside paid plans; API access is billed separately. Use your own or authorized material and review the translated text and layout before publishing.',
  'https://www.mangatranslate.com/',
  "Category"."id",
  'FREEMIUM'::"Pricing",
  ARRAY['Web'],
  false,
  'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource",
  'https://github.com/korbinjoe/toools/issues/9',
  now()
FROM "Category" WHERE "Category".slug = 'image-media'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "url" = EXCLUDED."url",
  "categoryId" = EXCLUDED."categoryId",
  "pricing" = EXCLUDED."pricing",
  "platforms" = EXCLUDED."platforms",
  "isOpenSource" = EXCLUDED."isOpenSource",
  "status" = EXCLUDED."status",
  "source" = COALESCE("Tool"."source", EXCLUDED."source"),
  "sourceUrl" = CASE WHEN "Tool"."source" IS NULL THEN EXCLUDED."sourceUrl" ELSE "Tool"."sourceUrl" END,
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT "Tool"."id", "Tag"."id"
FROM "Tool" JOIN "Tag" ON "Tag".slug IN ('ai', 'image-editing')
WHERE "Tool".slug = 'mangatranslate'
ON CONFLICT DO NOTHING;

INSERT INTO "ToolIdentity" (key, "toolId")
SELECT 'url:mangatranslate.com', id FROM "Tool" WHERE slug = 'mangatranslate'
ON CONFLICT DO NOTHING;

INSERT INTO "ToolDiscovery" (id, "toolId", source, method, "sourceKey", "sourceUrl", metadata)
SELECT gen_random_uuid()::text, id, 'MANUAL'::"ToolSource", 'issue',
  'korbinjoe/toools#9', 'https://github.com/korbinjoe/toools/issues/9',
  '{"reviewedOn":"2026-10-19","reviewBasis":"public documentation","sources":["https://www.mangatranslate.com/","https://www.mangatranslate.com/#pricing"]}'::jsonb
FROM "Tool" WHERE slug = 'mangatranslate'
ON CONFLICT ("toolId", source, method, "sourceKey") DO NOTHING;

COMMIT;

SELECT "name", "slug", "status", "pricing", "platforms", "url", "sourceUrl"
FROM "Tool" WHERE "slug" = 'mangatranslate';

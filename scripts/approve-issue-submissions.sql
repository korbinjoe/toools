-- Apply the approved submissions from GitHub issues #1 and #2 to the live catalog.
-- Run once in the Neon SQL Editor for the database used by toools.dev.
-- Safe to rerun: tool records are keyed by slug and tag links use ON CONFLICT.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM "Category" WHERE slug IN ('design', 'image-media')) <> 2 THEN
    RAISE EXCEPTION 'Required Design and Image & Media categories are missing';
  END IF;
  IF (SELECT count(*) FROM "Tag" WHERE slug IN ('design', 'generative-ai', 'image-editing')) <> 3 THEN
    RAISE EXCEPTION 'Required Design, Generative AI, or Image Editing tags are missing';
  END IF;
END $$;

INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Fomrix',
  'fomrix',
  'AI 3D generation and browser tools for 3D assets',
  'Fomrix turns text prompts and reference images into GLB 3D assets. Its browser tools can view GLB, STL, and OBJ files, convert GLB to STL, and inspect or repair STL meshes. AI generation uses credits, while the browser tools are free to use. Generated meshes should be checked before printing or production use.',
  'https://fomrix.com/',
  "Category"."id",
  'FREEMIUM'::"Pricing",
  ARRAY['Web'],
  'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource",
  'https://github.com/korbinjoe/toools/issues/1',
  now()
FROM "Category" WHERE "Category"."slug" = 'design'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "url" = EXCLUDED."url",
  "categoryId" = EXCLUDED."categoryId",
  "pricing" = EXCLUDED."pricing",
  "platforms" = EXCLUDED."platforms",
  "status" = EXCLUDED."status",
  "source" = EXCLUDED."source",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "updatedAt" = now();

INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'aigeneratornsfw.com',
  'aigeneratornsfw-com',
  '18+ AI studio for images and short videos',
  'aigeneratornsfw.com is an adults-only, browser-based studio for AI image generation, reference-image editing, image animation, and short video creation. The submitter describes the service as intended for non-explicit content, with model-specific restrictions. Image creation uses daily credits; video generation requires a paid membership and sufficient credits. Adults 18+ only.',
  'https://aigeneratornsfw.com/',
  "Category"."id",
  'FREEMIUM'::"Pricing",
  ARRAY['Web'],
  'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource",
  'https://github.com/korbinjoe/toools/issues/2',
  now()
FROM "Category" WHERE "Category"."slug" = 'image-media'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "url" = EXCLUDED."url",
  "categoryId" = EXCLUDED."categoryId",
  "pricing" = EXCLUDED."pricing",
  "platforms" = EXCLUDED."platforms",
  "status" = EXCLUDED."status",
  "source" = EXCLUDED."source",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "updatedAt" = now();

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT tool."id", tag."id"
FROM "Tool" tool
JOIN "Tag" tag ON tag."slug" IN ('design', 'generative-ai')
WHERE tool."slug" = 'fomrix'
ON CONFLICT DO NOTHING;

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT tool."id", tag."id"
FROM "Tool" tool
JOIN "Tag" tag ON tag."slug" IN ('generative-ai', 'image-editing')
WHERE tool."slug" = 'aigeneratornsfw-com'
ON CONFLICT DO NOTHING;

COMMIT;

SELECT "name", "slug", "status", "url"
FROM "Tool"
WHERE "slug" IN ('fomrix', 'aigeneratornsfw-com')
ORDER BY "slug";

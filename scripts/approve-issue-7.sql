-- Publish the maker's submission from GitHub issue #7 to the live catalog.
-- The website could not be independently verified from the current network.
-- Safe to rerun: the tool slug and tool-tag pairs are unique.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'video-audio') THEN
    RAISE EXCEPTION 'Required Video & Audio category is missing';
  END IF;
  IF (SELECT count(*) FROM "Tag" WHERE slug IN ('writing', 'audio')) <> 2 THEN
    RAISE EXCEPTION 'Required Writing or Audio tag is missing';
  END IF;
END $$;

INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "isOpenSource", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Voice Prompter',
  'voice-prompter',
  'Free browser teleprompter with speech tracking and local scripts',
  'According to its maker''s submission, Voice Prompter is a free browser teleprompter for rehearsing and reading scripts alongside a separate recording app. It offers manual and automatic scrolling, speech tracking, mirrored text, adjustable typography, a local script library, text export, and a floating script window in supported desktop browsers. No account or credit card is required. It does not record video, generate scripts, or sync scripts to the cloud. Speech recognition depends on the browser, language, and service; audio may be processed by the browser''s speech provider. The publicly viewable code has no open-source license.',
  'https://teleprompter.dev/',
  "Category"."id",
  'FREE'::"Pricing",
  ARRAY['Web'],
  false,
  'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource",
  'https://github.com/korbinjoe/toools/issues/7',
  now()
FROM "Category" WHERE "Category".slug = 'video-audio'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT "Tool"."id", "Tag"."id"
FROM "Tool"
JOIN "Tag" ON "Tag".slug IN ('writing', 'audio')
WHERE "Tool".slug = 'voice-prompter'
ON CONFLICT DO NOTHING;

COMMIT;

SELECT "name", "slug", "status", "pricing", "isOpenSource", "url", "sourceUrl"
FROM "Tool" WHERE "slug" = 'voice-prompter';

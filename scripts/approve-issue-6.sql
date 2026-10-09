-- Add the user-approved submission from GitHub issue #6 to the live catalog.
-- Product details are based on the submission; the website was not independently verified.
-- Safe to rerun: the tool slug and tool-tag pairs are unique.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Category" WHERE slug = 'video-audio') THEN
    RAISE EXCEPTION 'Required Video & Audio category is missing';
  END IF;
  IF (SELECT count(*) FROM "Tag" WHERE slug IN ('generative-ai', 'video-editing')) <> 2 THEN
    RAISE EXCEPTION 'Required Generative AI or Video Editing tag is missing';
  END IF;
END $$;

INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Hotel Lobby AI',
  'hotel-lobby-ai',
  'Create 18+ portrait videos and orange-booth images',
  'Hotel Lobby AI is an adults-only browser tool for placing consenting adults'' portraits into short video templates or a user-supplied video and creating orange recording-booth images. The submitter says users can choose which detected faces to replace. Use media only with permission and review AI results before sharing. The submission describes a limited trial of one image and one four-second video; credit packs are listed as coming soon.',
  'https://hotellobbyaigenerator.co/',
  "Category"."id",
  'FREEMIUM'::"Pricing",
  ARRAY['Web'],
  'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource",
  'https://github.com/korbinjoe/toools/issues/6',
  now()
FROM "Category" WHERE "Category".slug = 'video-audio'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT "Tool"."id", "Tag"."id"
FROM "Tool"
JOIN "Tag" ON "Tag".slug IN ('generative-ai', 'video-editing')
WHERE "Tool".slug = 'hotel-lobby-ai'
ON CONFLICT DO NOTHING;

COMMIT;

SELECT "name", "slug", "status", "url", "sourceUrl"
FROM "Tool" WHERE "slug" = 'hotel-lobby-ai';

-- Add the verified submissions from GitHub issues #3, #4, and #5 to the live catalog.
-- Run once against the production Neon database. Safe to rerun: slugs and tool-tag pairs are unique.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM "Category" WHERE slug IN ('image-media', 'video-audio')) <> 2 THEN
    RAISE EXCEPTION 'Required Image & Media or Video & Audio category is missing';
  END IF;
  IF (SELECT count(*) FROM "Tag" WHERE slug IN ('image-editing', 'design', 'ai', 'generative-ai')) <> 4 THEN
    RAISE EXCEPTION 'Required catalog tags are missing';
  END IF;
END $$;

WITH submissions (name, slug, tagline, description, url, category_slug, pricing, source_url) AS (
  VALUES
    (
      'PicCollages',
      'piccollages',
      'Free browser-based photo collages and image tools',
      'PicCollages offers free browser-based photo collage layouts, vertical and horizontal image stitching, and a free-layout editor. Users can add text, stickers, backgrounds, borders, and filters, then export PNG or JPG files. The site says selected photos are processed locally in the browser and that advertising supports the free tools.',
      'https://piccollages.com/',
      'image-media',
      'FREE',
      'https://github.com/korbinjoe/toools/issues/3'
    ),
    (
      'Describe Image',
      'describe-image',
      'AI descriptions, alt text, and OCR for images and videos',
      'Describe Image analyzes images and videos to draft descriptions, alt text, extracted text, visual prompts, and video summaries. Guests can try two image generations per day; paid plans provide more credits and advanced features. AI outputs should be reviewed before reuse, especially for accessibility or factual content.',
      'https://describeimage.io/',
      'image-media',
      'FREEMIUM',
      'https://github.com/korbinjoe/toools/issues/4'
    ),
    (
      'BabyVideo.ai',
      'babyvideo-ai',
      'Create playful baby portraits and short videos from photos',
      'BabyVideo.ai creates entertainment-only future-baby portraits from one or two parent photos and offers tools to animate baby photos into talking, singing, or dancing clips. Results are creative previews, not medical or genetic predictions. Signed-in users can earn limited daily check-in credits; paid packs and plans are also available.',
      'https://babyvideo.ai/',
      'video-audio',
      'FREEMIUM',
      'https://github.com/korbinjoe/toools/issues/5'
    )
)
INSERT INTO "Tool" (
  "id", "name", "slug", "tagline", "description", "url", "categoryId",
  "pricing", "platforms", "status", "source", "sourceUrl", "updatedAt"
)
SELECT
  gen_random_uuid()::text, submissions.name, submissions.slug,
  submissions.tagline, submissions.description, submissions.url, "Category"."id",
  submissions.pricing::"Pricing", ARRAY['Web'], 'APPROVED'::"ToolStatus",
  'MANUAL'::"ToolSource", submissions.source_url, now()
FROM submissions
JOIN "Category" ON "Category".slug = submissions.category_slug
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ToolTag" ("toolId", "tagId")
SELECT "Tool"."id", "Tag"."id"
FROM (VALUES
  ('piccollages', 'image-editing'),
  ('piccollages', 'design'),
  ('describe-image', 'ai'),
  ('babyvideo-ai', 'generative-ai'),
  ('babyvideo-ai', 'ai')
) AS links(tool_slug, tag_slug)
JOIN "Tool" ON "Tool".slug = links.tool_slug
JOIN "Tag" ON "Tag".slug = links.tag_slug
ON CONFLICT DO NOTHING;

COMMIT;

SELECT "name", "slug", "status", "url", "sourceUrl"
FROM "Tool"
WHERE "slug" IN ('piccollages', 'describe-image', 'babyvideo-ai')
ORDER BY "slug";

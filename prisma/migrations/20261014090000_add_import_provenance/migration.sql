ALTER TYPE "ToolSource" ADD VALUE 'GITHUB_REPOSITORY';
ALTER TYPE "ToolSource" ADD VALUE 'GITHUB_DIRECTORY';

CREATE TABLE "ToolIdentity" (
    "key" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolIdentity_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ToolDiscovery" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "source" "ToolSource" NOT NULL,
    "method" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "metadata" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolDiscovery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ToolIdentity_toolId_idx" ON "ToolIdentity"("toolId");
CREATE UNIQUE INDEX "ToolDiscovery_toolId_source_method_sourceKey_key"
    ON "ToolDiscovery"("toolId", "source", "method", "sourceKey");
CREATE INDEX "ToolDiscovery_source_method_idx" ON "ToolDiscovery"("source", "method");
ALTER TABLE "ToolIdentity" ADD CONSTRAINT "ToolIdentity_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ToolDiscovery" ADD CONSTRAINT "ToolDiscovery_toolId_fkey"
    FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the source previously stored on every existing tool. Historical
-- discovery time is unknown, so use the migration time rather than invent it.
INSERT INTO "ToolDiscovery" ("id", "toolId", "source", "method", "sourceKey", "sourceUrl", "metadata")
SELECT 'legacy_' || "id", "id", "source", 'legacy', "sourceUrl", "sourceUrl",
       '{"historicalDiscoveryTimeUnknown":true}'::jsonb
FROM "Tool" WHERE "source" IS NOT NULL AND "sourceUrl" IS NOT NULL;

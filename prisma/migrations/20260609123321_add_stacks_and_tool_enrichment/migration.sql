-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "cons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pros" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Stack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "editorNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stackId" TEXT NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageRecommendation" (
    "stageId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StageRecommendation_pkey" PRIMARY KEY ("stageId","toolId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stack_name_key" ON "Stack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Stack_slug_key" ON "Stack"("slug");

-- CreateIndex
CREATE INDEX "Stage_stackId_idx" ON "Stage"("stackId");

-- CreateIndex
CREATE INDEX "StageRecommendation_toolId_idx" ON "StageRecommendation"("toolId");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRecommendation" ADD CONSTRAINT "StageRecommendation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageRecommendation" ADD CONSTRAINT "StageRecommendation_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

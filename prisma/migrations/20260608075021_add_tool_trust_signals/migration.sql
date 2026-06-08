-- CreateEnum
CREATE TYPE "ToolSource" AS ENUM ('MANUAL', 'PRODUCT_HUNT', 'AWESOME_LIST');

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "githubStars" INTEGER,
ADD COLUMN     "phVotes" INTEGER,
ADD COLUMN     "source" "ToolSource",
ADD COLUMN     "sourceUrl" TEXT;

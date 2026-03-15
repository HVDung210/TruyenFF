/*
  Warnings:

  - A unique constraint covering the columns `[user_id,story_id]` on the table `ReadHistory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chapter_number` to the `ReadHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FavoriteStories" DROP CONSTRAINT "FavoriteStories_story_id_fkey";

-- DropForeignKey
ALTER TABLE "FavoriteStories" DROP CONSTRAINT "FavoriteStories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowedStories" DROP CONSTRAINT "FollowedStories_story_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowedStories" DROP CONSTRAINT "FollowedStories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ReadHistory" DROP CONSTRAINT "ReadHistory_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "ReadHistory" DROP CONSTRAINT "ReadHistory_story_id_fkey";

-- DropForeignKey
ALTER TABLE "ReadHistory" DROP CONSTRAINT "ReadHistory_user_id_fkey";

-- DropIndex
DROP INDEX "Chapter_story_id_idx";

-- DropIndex
DROP INDEX "ChapterImage_chapter_id_idx";

-- DropIndex
DROP INDEX "Story_hot_idx";

-- DropIndex
DROP INDEX "Story_status_idx";

-- AlterTable
ALTER TABLE "ReadHistory" ADD COLUMN     "chapter_number" INTEGER NOT NULL,
ADD COLUMN     "read_percentage" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "FavoriteStories_user_id_idx" ON "FavoriteStories"("user_id");

-- CreateIndex
CREATE INDEX "FavoriteStories_story_id_idx" ON "FavoriteStories"("story_id");

-- CreateIndex
CREATE INDEX "FollowedStories_user_id_idx" ON "FollowedStories"("user_id");

-- CreateIndex
CREATE INDEX "FollowedStories_story_id_idx" ON "FollowedStories"("story_id");

-- CreateIndex
CREATE INDEX "ReadHistory_user_id_read_at_idx" ON "ReadHistory"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "ReadHistory_user_id_story_id_idx" ON "ReadHistory"("user_id", "story_id");

-- CreateIndex
CREATE INDEX "ReadHistory_story_id_idx" ON "ReadHistory"("story_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReadHistory_user_id_story_id_key" ON "ReadHistory"("user_id", "story_id");

-- AddForeignKey
ALTER TABLE "FollowedStories" ADD CONSTRAINT "FollowedStories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedStories" ADD CONSTRAINT "FollowedStories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStories" ADD CONSTRAINT "FavoriteStories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStories" ADD CONSTRAINT "FavoriteStories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "Chapter"("chapter_id") ON DELETE CASCADE ON UPDATE CASCADE;

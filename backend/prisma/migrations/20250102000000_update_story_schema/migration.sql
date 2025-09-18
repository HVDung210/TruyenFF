-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS "UserActivities" CASCADE;
DROP TABLE IF EXISTS "ReadHistory" CASCADE;
DROP TABLE IF EXISTS "FavoriteStories" CASCADE;
DROP TABLE IF EXISTS "FollowedStories" CASCADE;
DROP TABLE IF EXISTS "StoryGenres" CASCADE;
DROP TABLE IF EXISTS "ChapterImage" CASCADE;
DROP TABLE IF EXISTS "Chapter" CASCADE;
DROP TABLE IF EXISTS "Story" CASCADE;
DROP TABLE IF EXISTS "Genre" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "auth_provider" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Story" (
    "story_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "cover" TEXT NOT NULL, -- Changed from cover_image_url to cover
    "status" TEXT NOT NULL,
    "chapter_count" INTEGER NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT, -- Last update time as string (e.g., "2 Giờ Trước")
    "published_date" TIMESTAMP(3),
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("story_id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "chapter_id" SERIAL NOT NULL,
    "story_id" INTEGER NOT NULL,
    "chapter_number" INTEGER NOT NULL, -- Changed from DOUBLE to INTEGER
    "chapter_title" TEXT, -- Chapter title like "Chương 1"
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("chapter_id")
);

-- CreateTable
CREATE TABLE "ChapterImage" (
    "image_id" SERIAL NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "image_order" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,

    CONSTRAINT "ChapterImage_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "genre_id" SERIAL NOT NULL,
    "genre_name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("genre_id")
);

-- CreateTable
CREATE TABLE "StoryGenres" (
    "story_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "StoryGenres_pkey" PRIMARY KEY ("story_id","genre_id")
);

-- CreateTable
CREATE TABLE "FollowedStories" (
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "followed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedStories_pkey" PRIMARY KEY ("user_id","story_id")
);

-- CreateTable
CREATE TABLE "FavoriteStories" (
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "favorited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteStories_pkey" PRIMARY KEY ("user_id","story_id")
);

-- CreateTable
CREATE TABLE "ReadHistory" (
    "history_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "story_id" INTEGER NOT NULL,
    "chapter_id" INTEGER NOT NULL,
    "last_read_page" INTEGER,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "UserActivities" (
    "activity_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "activity_description" TEXT,
    "activity_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_genre_name_key" ON "Genre"("genre_name");

-- CreateIndex
CREATE INDEX "Story_hot_idx" ON "Story"("hot");

-- CreateIndex
CREATE INDEX "Story_status_idx" ON "Story"("status");

-- CreateIndex
CREATE INDEX "Chapter_story_id_idx" ON "Chapter"("story_id");

-- CreateIndex
CREATE INDEX "ChapterImage_chapter_id_idx" ON "ChapterImage"("chapter_id");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterImage" ADD CONSTRAINT "ChapterImage_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "Chapter"("chapter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGenres" ADD CONSTRAINT "StoryGenres_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGenres" ADD CONSTRAINT "StoryGenres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "Genre"("genre_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedStories" ADD CONSTRAINT "FollowedStories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedStories" ADD CONSTRAINT "FollowedStories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStories" ADD CONSTRAINT "FavoriteStories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteStories" ADD CONSTRAINT "FavoriteStories_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "Story"("story_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadHistory" ADD CONSTRAINT "ReadHistory_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "Chapter"("chapter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivities" ADD CONSTRAINT "UserActivities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

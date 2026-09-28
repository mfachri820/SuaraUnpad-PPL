-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('ASPIRASI', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('SPAM', 'UJARAN_KEBENCIAN', 'PELECEHAN', 'HOAKS', 'TIDAK_RELEVAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDING', 'ACTIONED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "NotificationType" ADD VALUE 'POST_CLOSED';
ALTER TYPE "NotificationType" ADD VALUE 'CONTENT_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by_id" UUID,
ADD COLUMN     "closed_reason" TEXT,
ADD COLUMN     "image_url" VARCHAR,
ADD COLUMN     "kind" "PostKind" NOT NULL DEFAULT 'ASPIRASI',
ADD COLUMN     "pinned_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "deleted_by_id" UUID;

-- CreateTable
CREATE TABLE "content_flags" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "post_id" UUID,
    "comment_id" UUID,
    "reason" "FlagReason" NOT NULL,
    "note" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_flags_post_id_status_idx" ON "content_flags"("post_id", "status");

-- CreateIndex
CREATE INDEX "content_flags_comment_id_status_idx" ON "content_flags"("comment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_flags_reporter_id_post_id_key" ON "content_flags"("reporter_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_flags_reporter_id_comment_id_key" ON "content_flags"("reporter_id", "comment_id");

-- CreateIndex
CREATE INDEX "reports_author_id_idx" ON "reports"("author_id");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "report_upvotes_report_id_idx" ON "report_upvotes"("report_id");

-- CreateIndex
CREATE INDEX "policies_status_created_at_idx" ON "policies"("status", "created_at");

-- CreateIndex
CREATE INDEX "votes_policy_id_idx" ON "votes"("policy_id");

-- CreateIndex
CREATE INDEX "posts_kind_created_at_idx" ON "posts"("kind", "created_at");

-- CreateIndex
CREATE INDEX "posts_kind_pinned_until_idx" ON "posts"("kind", "pinned_until");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_policy_id_idx" ON "posts"("policy_id");

-- CreateIndex
CREATE INDEX "comments_post_id_parent_id_created_at_idx" ON "comments"("post_id", "parent_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_policy_id_parent_id_created_at_idx" ON "comments"("policy_id", "parent_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "comment_mentions_mentioned_user_id_idx" ON "comment_mentions"("mentioned_user_id");

-- CreateIndex
CREATE INDEX "transactions_campaign_id_idx" ON "transactions"("campaign_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "post_upvotes_post_id_idx" ON "post_upvotes"("post_id");

-- CreateIndex
CREATE INDEX "comment_upvotes_comment_id_idx" ON "comment_upvotes"("comment_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_exactly_one_target" CHECK (num_nonnulls("post_id", "comment_id") = 1);

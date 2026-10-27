-- AlterTable
ALTER TABLE "reports" ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "in_progress_at" TIMESTAMP(3),
ADD COLUMN "resolved_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- Backfill: waktu tahap untuk laporan lama diperkirakan dari updated_at
UPDATE "reports" SET "verified_at" = "updated_at" WHERE "status" IN ('VERIFIED', 'IN_PROGRESS', 'RESOLVED');
UPDATE "reports" SET "in_progress_at" = "updated_at" WHERE "status" IN ('IN_PROGRESS', 'RESOLVED');
UPDATE "reports" SET "resolved_at" = "updated_at" WHERE "status" = 'RESOLVED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "policy_id" UUID;

-- AlterTable
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

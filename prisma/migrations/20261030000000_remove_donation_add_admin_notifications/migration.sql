-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NEW_REPORT';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_CONTENT_FLAG';

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropTable
DROP TABLE "donation_campaigns";

-- DropTable
DROP TABLE "transactions";

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "PaymentStatus";


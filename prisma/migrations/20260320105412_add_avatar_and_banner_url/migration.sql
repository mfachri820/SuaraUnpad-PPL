/*
  Warnings:

  - Added the required column `banner_url` to the `donation_campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "donation_campaigns" ADD COLUMN     "banner_url" VARCHAR NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR;

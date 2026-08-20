/*
  Warnings:

  - Made the column `status` on table `conversations_meta` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "conversations_meta" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by" TEXT,
ADD COLUMN     "hand_over_status" TEXT DEFAULT 'none',
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'open';

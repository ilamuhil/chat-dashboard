/*
  Warnings:

  - Made the column `organization_id` on table `conversations_meta` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "conversations_meta" ALTER COLUMN "organization_id" SET NOT NULL;

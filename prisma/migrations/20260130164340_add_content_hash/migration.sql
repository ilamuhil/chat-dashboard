-- AlterTable
ALTER TABLE "organization_invites" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "accepted_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "training_sources" ADD COLUMN     "content_hash" TEXT,
ALTER COLUMN "source_value" DROP NOT NULL;

-- AlterTable
ALTER TABLE "training_sources" ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "size_bytes" BIGINT;

-- CreateIndex
CREATE INDEX "files_org_bot_path_idx" ON "files"("organization_id", "bot_id", "path");

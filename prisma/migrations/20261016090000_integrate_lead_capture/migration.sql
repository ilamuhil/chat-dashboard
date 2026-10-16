BEGIN;

-- AlterTable
ALTER TABLE "conversations_meta" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "lead_capture_state" JSONB,
ADD COLUMN     "summary_generated_at" TIMESTAMP(3),
ADD COLUMN     "summary_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "summary_through_message_id" UUID;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "joining_preference_details" TEXT,
ADD COLUMN     "profile_metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "profile_version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "consent_to_contact" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lead_follow_ups" ADD COLUMN     "source_request_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "leads_active_visitor_key" ON "leads"("organization_id", "bot_id", "visitor_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "lead_follow_ups_source_request_key" ON "lead_follow_ups"("source_request_id");

COMMIT;

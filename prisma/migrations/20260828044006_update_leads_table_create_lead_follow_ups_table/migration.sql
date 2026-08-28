/*
  Warnings:

  - Added the required column `updated_at` to the `leads` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "consent_to_contact" BOOLEAN DEFAULT false,
ADD COLUMN     "course_interest" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" UUID,
ADD COLUMN     "education_level" TEXT,
ADD COLUMN     "enquirer_type" TEXT,
ADD COLUMN     "joining_timeline" TEXT,
ADD COLUMN     "lead_priority" TEXT,
ADD COLUMN     "pipeline_stage" TEXT,
ADD COLUMN     "preferred_mode" TEXT,
ADD COLUMN     "primary_intent" TEXT,
ADD COLUMN     "priority_reason" TEXT,
ADD COLUMN     "recommended_next_action" TEXT,
ADD COLUMN     "student_age" TEXT,
ADD COLUMN     "student_gender" TEXT,
ADD COLUMN     "student_name" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "visitor_id" UUID;

-- CreateTable
CREATE TABLE "lead_follow_ups" (
    "id" UUID NOT NULL,
    "counsellor_id" UUID,
    "follow_up_type" TEXT,
    "status" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_follow_ups_lead_id_idx" ON "lead_follow_ups"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

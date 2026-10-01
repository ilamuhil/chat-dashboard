CREATE INDEX "leads_org_deleted_captured_idx"
ON "public"."leads"("organization_id", "deleted_at", "captured_at" DESC);

CREATE INDEX "leads_org_deleted_stage_idx"
ON "public"."leads"("organization_id", "deleted_at", "pipeline_stage");

CREATE INDEX "lead_follow_ups_lead_deleted_scheduled_idx"
ON "public"."lead_follow_ups"("lead_id", "deleted_at", "scheduled_for");

-- Socket identities fence old connections; the version invalidates pending AI turns.
ALTER TABLE "public"."conversations_meta"
  ADD COLUMN "handover_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "visitor_connection_id" UUID,
  ADD COLUMN "agent_connection_id" UUID,
  ADD COLUMN "active_agent_id" UUID;

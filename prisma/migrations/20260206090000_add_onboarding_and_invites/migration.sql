-- Add onboarding_completed flag to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Create organization_invites table
CREATE TABLE IF NOT EXISTS "organization_invites" (
  "id" UUID NOT NULL,
  "organization_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'editor',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "accepted_at" TIMESTAMPTZ,
  CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "organization_invites_email_idx" ON "organization_invites" ("email");
CREATE INDEX IF NOT EXISTS "organization_invites_organization_id_idx" ON "organization_invites" ("organization_id");

ALTER TABLE "organization_invites"
ADD CONSTRAINT "organization_invites_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;


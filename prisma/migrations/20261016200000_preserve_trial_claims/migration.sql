-- Trial eligibility survives organization deletion; it is tied to the user.
ALTER TABLE "public"."billing_trial_claims" DROP CONSTRAINT "billing_trial_claims_organization_id_fkey";

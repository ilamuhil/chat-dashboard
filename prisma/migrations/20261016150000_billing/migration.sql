-- CreateTable
CREATE TABLE "billing_accounts" (
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL DEFAULT 'trial',
    "plan_version" TEXT NOT NULL,
    "limits" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "trial_ends_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_through" TIMESTAMPTZ(6),
    "grace_until" TIMESTAMPTZ(6),
    "current_period_id" UUID,
    "provider_subscription_id" TEXT,
    "provider_status" TEXT,
    "provider_updated_at" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "pending_plan_id" TEXT,
    "billing_details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("organization_id")
);

-- CreateTable
CREATE TABLE "billing_trial_claims" (
    "user_id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_trial_claims_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "billing_periods" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_version" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "reply_limit" INTEGER NOT NULL,
    "replies_used" INTEGER NOT NULL DEFAULT 0,
    "replies_reserved" INTEGER NOT NULL DEFAULT 0,
    "training_limit" BIGINT NOT NULL,
    "training_used" BIGINT NOT NULL DEFAULT 0,
    "training_reserved" BIGINT NOT NULL DEFAULT 0,
    "payment_id" TEXT,

    CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_checkouts" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'subscription',
    "provider_id" TEXT NOT NULL,
    "session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "subtotal_paise" INTEGER NOT NULL,
    "tax_paise" INTEGER NOT NULL,
    "total_paise" INTEGER NOT NULL,
    "tax_bps" INTEGER NOT NULL,
    "first_charge_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider_subscription_id" TEXT,
    "checkout_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "refunded_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "scheduled_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "receipt_number" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "provider_id" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "error" TEXT,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "amount" BIGINT NOT NULL,
    "pack_id" TEXT,
    "response" JSONB,
    "cost" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_credit_packs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "replies" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "billing_credit_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_source_usage" (
    "source_id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tokens" BIGINT NOT NULL,
    "pending_tokens" BIGINT NOT NULL DEFAULT 0,
    "content_hash" TEXT,

    CONSTRAINT "billing_source_usage_pkey" PRIMARY KEY ("source_id")
);

-- CreateTable
CREATE TABLE "billing_notices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_provider_subscription_id_key" ON "billing_accounts"("provider_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_payment_id_key" ON "billing_periods"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_organization_id_starts_at_key" ON "billing_periods"("organization_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkouts_provider_id_key" ON "billing_checkouts"("provider_id");

-- CreateIndex
CREATE INDEX "billing_checkouts_organization_id_created_at_idx" ON "billing_checkouts"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payments_receipt_number_key" ON "billing_payments"("receipt_number");

-- CreateIndex
CREATE INDEX "billing_payments_organization_id_paid_at_idx" ON "billing_payments"("organization_id", "paid_at");

-- CreateIndex
CREATE INDEX "billing_usage_organization_id_created_at_idx" ON "billing_usage"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_usage_status_created_at_idx" ON "billing_usage"("status", "created_at");

-- CreateIndex
CREATE INDEX "billing_credit_packs_organization_id_expires_at_idx" ON "billing_credit_packs"("organization_id", "expires_at");

-- CreateIndex
CREATE INDEX "billing_source_usage_organization_id_idx" ON "billing_source_usage"("organization_id");

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_trial_claims" ADD CONSTRAINT "billing_trial_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_usage" ADD CONSTRAINT "billing_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_credit_packs" ADD CONSTRAINT "billing_credit_packs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_source_usage" ADD CONSTRAINT "billing_source_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_notices" ADD CONSTRAINT "billing_notices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "billing_accounts"("organization_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Counters must stay nonnegative even under concurrent reservations.
ALTER TABLE billing_periods ADD CONSTRAINT billing_periods_nonnegative CHECK
(reply_limit >= 0 AND replies_used >= 0 AND replies_reserved >= 0 AND training_limit >= 0 AND training_used >= 0 AND training_reserved >= 0 AND ends_at >= starts_at);
ALTER TABLE billing_credit_packs ADD CONSTRAINT billing_packs_nonnegative CHECK
(replies >= 0 AND used >= 0 AND reserved >= 0 AND used + reserved <= replies);
ALTER TABLE billing_usage ADD CONSTRAINT billing_usage_positive CHECK (amount >= 0);
ALTER TABLE billing_source_usage ADD CONSTRAINT billing_source_nonnegative CHECK (tokens >= 0 AND pending_tokens >= 0);
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkout_amounts CHECK
(subtotal_paise >= 0 AND tax_paise >= 0 AND total_paise = subtotal_paise + tax_paise);

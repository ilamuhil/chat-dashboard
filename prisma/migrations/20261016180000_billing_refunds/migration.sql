CREATE TABLE "public"."billing_refunds" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payment_id" TEXT NOT NULL REFERENCES "public"."billing_payments"("id") ON DELETE CASCADE,
  "amount_paise" INTEGER NOT NULL CHECK ("amount_paise" > 0),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "billing_refunds_payment_id_idx" ON "public"."billing_refunds"("payment_id");

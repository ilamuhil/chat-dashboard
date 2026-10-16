CREATE SEQUENCE "public"."billing_invoice_number_seq" MAXVALUE 9999999999;
ALTER TABLE "public"."billing_checkouts" ADD COLUMN "billing_snapshot" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "public"."billing_payments" ADD COLUMN "invoice_number" TEXT NOT NULL DEFAULT ('INV' || lpad(nextval('public.billing_invoice_number_seq')::text, 10, '0'));
CREATE UNIQUE INDEX "billing_payments_invoice_number_key" ON "public"."billing_payments"("invoice_number");

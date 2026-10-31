ALTER TABLE public.bots ADD COLUMN lead_capture_config jsonb NOT NULL DEFAULT '{}'::jsonb;

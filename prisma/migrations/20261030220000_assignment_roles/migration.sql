-- Prevent assignment to read-only or departed staff, including concurrent demotions.
CREATE OR REPLACE FUNCTION public.guard_operational_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE assignee uuid; org text;
BEGIN
 IF TG_TABLE_NAME='leads' THEN
  assignee := NEW.assigned_counsellor_id; org := NEW.organization_id;
 ELSE
  assignee := NEW.counsellor_id;
  SELECT organization_id INTO org FROM public.leads WHERE id=NEW.lead_id;
 END IF;
 IF assignee IS NOT NULL THEN
  PERFORM 1 FROM public.organization_members m JOIN public.users u ON u.id=m.user_id
   WHERE m.organization_id=org AND m.user_id=assignee
    AND m.role IN ('owner','admin','counsellor') AND u.is_active AND NOT u.is_banned
   FOR SHARE OF m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active Owner, Admin or Counsellor in this institute' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lead_operational_assignment BEFORE INSERT OR UPDATE OF assigned_counsellor_id ON public.leads
 FOR EACH ROW EXECUTE FUNCTION public.guard_operational_assignment();
CREATE TRIGGER followup_operational_assignment BEFORE INSERT OR UPDATE OF counsellor_id ON public.lead_follow_ups
 FOR EACH ROW EXECUTE FUNCTION public.guard_operational_assignment();

-- Three nullable columns; reuse existing scoring fields and notifications as an outbox.
ALTER TABLE public.leads ADD COLUMN assigned_counsellor_id uuid;
ALTER TABLE public.notifications ADD COLUMN event_key text;
ALTER TABLE public.notifications ADD COLUMN dismissed_at timestamp(3);
CREATE UNIQUE INDEX notifications_event_key_key ON public.notifications(event_key);
CREATE INDEX leads_org_owner_idx ON public.leads(organization_id, assigned_counsellor_id, deleted_at);
CREATE INDEX follow_ups_worklist_idx ON public.lead_follow_ups(status, deleted_at, scheduled_for);

-- One deterministic implementation shared by dashboard edits and accepted chat facts.
CREATE FUNCTION public.calculate_lead_score(timeline text, intent text, stage text, course text, email text, phone text, consent boolean)
RETURNS TABLE(priority text, reason text) LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE points integer := 0; timeline_points integer := 0; intent_points integer := 0; reasons text[] := ARRAY[]::text[];
BEGIN
  IF stage IN ('enrolled', 'lost') THEN
    RETURN QUERY SELECT 'cold'::text, 'Rules v1: ' || initcap(stage) || ' lead; no active admissions priority.'; RETURN;
  END IF;
  IF consent IS FALSE THEN
    RETURN QUERY SELECT 'cold'::text, 'Rules v1: Consent to contact is not given or was withdrawn; do not contact.'; RETURN;
  END IF;
  timeline_points := CASE
    WHEN timeline IN ('as_soon_as_possible', 'immediate', 'within_1_week') THEN 40
    WHEN timeline IN ('within_1_month', 'next_available_intake') THEN 30
    WHEN timeline = 'within_3_months' THEN 15 ELSE 0 END;
  IF timeline_points > 0 THEN reasons := array_append(reasons, replace(timeline, '_', ' ') || ' +' || timeline_points); END IF;
  intent_points := CASE WHEN intent = 'application' OR stage = 'application_started' THEN 35
    WHEN intent IN ('counselling', 'demo', 'campus_visit') OR stage = 'counselling_requested' THEN 30
    WHEN intent IN ('fees', 'eligibility', 'elligibility', 'batch_or_schedule', 'course_recommendation') THEN 15
    WHEN intent = 'course_info' THEN 10 ELSE 0 END;
  IF intent_points > 0 THEN reasons := array_append(reasons,
    CASE WHEN stage = 'application_started' THEN 'application started'
         WHEN stage = 'counselling_requested' AND intent IS DISTINCT FROM 'application' THEN 'counselling requested'
         ELSE replace(intent, '_', ' ') END || ' +' || intent_points); END IF;
  points := timeline_points + intent_points;
  IF nullif(btrim(course), '') IS NOT NULL THEN points := points + 10; reasons := array_append(reasons, 'course interest recorded +10'); END IF;
  IF nullif(btrim(email), '') IS NOT NULL OR nullif(btrim(phone), '') IS NOT NULL THEN points := points + 10; reasons := array_append(reasons, 'contact details recorded +10'); END IF;
  IF consent IS TRUE THEN points := points + 10; reasons := array_append(reasons, 'contact consent given +10'); END IF;
  priority := CASE WHEN points >= 70 AND consent IS TRUE AND (nullif(btrim(email), '') IS NOT NULL OR nullif(btrim(phone), '') IS NOT NULL) THEN 'hot' WHEN points >= 35 THEN 'warm' ELSE 'cold' END;
  reason := 'Rules v1: ' || points || ' points. ' || coalesce(nullif(array_to_string(reasons, '; '), ''), 'No qualifying intent or timeline recorded') || '. Hot: 70+ with contact details and consent; Warm: 35+; otherwise Cold.';
  IF points >= 70 AND priority <> 'hot' THEN reason := reason || ' Hot is held until contact details and consent are recorded.'; END IF;
  RETURN NEXT;
END $$;

CREATE FUNCTION public.score_lead_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assigned_counsellor_id IS NOT NULL THEN
    PERFORM 1 FROM public.organization_members WHERE organization_id = NEW.organization_id AND user_id = NEW.assigned_counsellor_id FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Counsellor must be a member of this organization' USING ERRCODE = '23514'; END IF;
  END IF;
  SELECT priority, reason INTO NEW.lead_priority, NEW.priority_reason FROM public.calculate_lead_score(NEW.joining_timeline, NEW.primary_intent, NEW.pipeline_stage, NEW.course_interest, NEW.email, NEW.phone, NEW.consent_to_contact);
  RETURN NEW;
END $$;
CREATE TRIGGER leads_score BEFORE INSERT OR UPDATE OF joining_timeline, primary_intent, pipeline_stage, course_interest, email, phone, consent_to_contact, lead_priority, priority_reason, assigned_counsellor_id, organization_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.score_lead_before_write();
-- Backfill without sending historical hot-lead alerts.
UPDATE public.leads SET lead_priority = lead_priority WHERE deleted_at IS NULL;

CREATE FUNCTION public.emit_lead_alert(org text, owner_id uuid, kind text, alert_title text, alert_body text, details jsonb, event_prefix text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.notifications(id, organization_id, user_id, title, body, type, metadata, channels, event_key)
  SELECT gen_random_uuid(), org, m.user_id, alert_title, alert_body, kind, details,
    '{"dashboard":true,"email":"pending","attempts":0}'::jsonb, event_prefix || ':' || m.user_id
  FROM public.organization_members m
  WHERE m.organization_id = org AND m.user_id IS NOT NULL
    AND ((owner_id IS NOT NULL AND m.user_id = owner_id) OR
      (NOT EXISTS (SELECT 1 FROM public.organization_members o WHERE o.organization_id = org AND o.user_id = owner_id) AND m.role = 'admin'))
  ON CONFLICT(event_key) DO NOTHING;
$$;

CREATE FUNCTION public.alert_lead_after_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE details jsonb; event text := gen_random_uuid()::text; label text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.organization_id IS NULL THEN RETURN NEW; END IF;
  label := coalesce(NEW.name, NEW.student_name, 'Unnamed lead');
  details := jsonb_build_object('leadId', NEW.id, 'priorityReason', NEW.priority_reason);
  IF NEW.lead_priority = 'hot' AND (TG_OP = 'INSERT' OR OLD.lead_priority IS DISTINCT FROM 'hot') THEN
    PERFORM public.emit_lead_alert(NEW.organization_id, NEW.assigned_counsellor_id, 'lead_hot', 'New hot lead', label || ' is now Hot. ' || NEW.priority_reason, details, 'lead_hot:' || NEW.id || ':' || event);
  END IF;
  IF NEW.pipeline_stage = 'qualified' AND (TG_OP = 'INSERT' OR OLD.pipeline_stage IS DISTINCT FROM 'qualified') THEN
    PERFORM public.emit_lead_alert(NEW.organization_id, NEW.assigned_counsellor_id, 'lead_qualified', 'Lead qualified', label || ' has moved to Qualified.', details, 'lead_qualified:' || NEW.id || ':' || event);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER leads_alert AFTER INSERT OR UPDATE OF lead_priority, pipeline_stage, joining_timeline, primary_intent, course_interest, email, phone, consent_to_contact ON public.leads FOR EACH ROW EXECUTE FUNCTION public.alert_lead_after_write();

-- Return departed members' work to the unassigned queues, including user deletion.
CREATE FUNCTION public.unassign_departed_counsellor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.leads SET assigned_counsellor_id = NULL WHERE organization_id = OLD.organization_id AND assigned_counsellor_id = OLD.user_id;
  UPDATE public.lead_follow_ups f SET counsellor_id = NULL FROM public.leads l WHERE f.lead_id = l.id AND l.organization_id = OLD.organization_id AND f.counsellor_id = OLD.user_id;
  RETURN OLD;
END $$;
CREATE TRIGGER members_unassign BEFORE DELETE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.unassign_departed_counsellor();

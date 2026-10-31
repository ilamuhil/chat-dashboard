ALTER TABLE public.leads ADD COLUMN lost_reason text;
CREATE TABLE public.lead_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 organization_id text NOT NULL, actor_id uuid, actor_label text NOT NULL, kind text NOT NULL,
 body text, details jsonb NOT NULL DEFAULT '{}', created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX lead_activity_lead_time_idx ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX lead_activity_org_time_idx ON public.lead_activities(organization_id, created_at);

-- Preserve what is known at rollout without fabricating earlier changes or dates.
INSERT INTO public.lead_activities(lead_id,organization_id,actor_label,kind,body,details)
SELECT id,organization_id,'System','tracking_started','Activity tracking started. Earlier changes are not available.',
 jsonb_build_object('pipelineStage',pipeline_stage,'assignedCounsellorId',assigned_counsellor_id)
FROM public.leads WHERE deleted_at IS NULL AND organization_id IS NOT NULL;
UPDATE public.lead_follow_ups SET status='requested' WHERE source_request_id IS NOT NULL AND status='pending' AND deleted_at IS NULL AND (counsellor_id IS NULL OR scheduled_for IS NULL);

CREATE FUNCTION public.record_lead_activity(lid uuid, event_kind text, event_body text, event_details jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE org text; actor uuid; label text; actor_setting text := nullif(current_setting('app.actor_id',true),'');
BEGIN
 SELECT organization_id INTO org FROM public.leads WHERE id=lid;
 IF org IS NULL THEN RETURN; END IF;
 IF actor_setting IS NOT NULL THEN
   SELECT u.id,coalesce(nullif(u.full_name,''),u.email,'Organization member') INTO actor,label
   FROM public.organization_members m JOIN public.users u ON u.id=m.user_id
   WHERE m.organization_id=org AND m.user_id::text=actor_setting;
   IF actor IS NULL THEN RAISE EXCEPTION 'Actor is not an organization member' USING ERRCODE='42501'; END IF;
 ELSE label := CASE WHEN current_setting('app.actor_kind',true)='visitor' THEN 'Visitor via chatbot' ELSE 'System' END;
 END IF;
 INSERT INTO public.lead_activities(lead_id,organization_id,actor_id,actor_label,kind,body,details)
 VALUES(lid,org,actor,label,event_kind,event_body,event_details ||
   CASE WHEN nullif(current_setting('app.conversation_id',true),'') IS NOT NULL THEN jsonb_build_object('conversationId',current_setting('app.conversation_id',true)) ELSE '{}'::jsonb END);
END $$;

CREATE FUNCTION public.calculate_lead_next_action(l public.leads) RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE task public.lead_follow_ups; activity text;
BEGIN
 IF l.deleted_at IS NOT NULL THEN RETURN 'no_action_closed'; END IF;
 IF l.pipeline_stage IN ('enrolled','lost') THEN
  IF EXISTS(SELECT 1 FROM public.lead_follow_ups WHERE lead_id=l.id AND deleted_at IS NULL AND status='requested') THEN RETURN 'review_closed_lead_request'; END IF;
  RETURN 'no_action_closed';
 END IF;
 IF l.consent_to_contact IS FALSE THEN RETURN 'respect_contact_consent'; END IF;
 SELECT * INTO task FROM public.lead_follow_ups WHERE lead_id=l.id AND deleted_at IS NULL AND status IN ('requested','pending')
 ORDER BY CASE WHEN status='requested' THEN 0 WHEN scheduled_for < CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN 1 ELSE 2 END,created_at,id LIMIT 1;
 IF FOUND THEN
  activity:=coalesce(task.follow_up_type,'follow_up');
  IF task.counsellor_id IS NULL THEN RETURN 'assign_' || activity; END IF;
  IF task.status='requested' THEN RETURN 'confirm_' || activity; END IF;
  IF task.scheduled_for IS NULL THEN RETURN 'schedule_' || activity; END IF;
  RETURN 'follow_up_' || activity;
 END IF;
 IF l.assigned_counsellor_id IS NULL THEN RETURN 'assign_lead'; END IF;
 IF l.consent_to_contact IS NOT TRUE THEN RETURN 'review_contact_consent'; END IF;
 IF nullif(btrim(l.email),'') IS NULL AND nullif(btrim(l.phone),'') IS NULL THEN RETURN 'collect_contact_details'; END IF;
 IF l.primary_intent IN ('eligibility','elligibility') THEN RETURN 'review_eligibility'; END IF;
 IF l.pipeline_stage='application_started' OR l.primary_intent='application' THEN RETURN 'application_follow_up'; END IF;
 IF l.primary_intent='demo' THEN RETURN 'schedule_demo'; END IF;
 IF l.primary_intent='campus_visit' THEN RETURN 'schedule_campus_visit'; END IF;
 IF l.primary_intent='counselling' OR l.pipeline_stage='counselling_requested' THEN RETURN 'schedule_callback'; END IF;
 IF nullif(btrim(l.course_interest),'') IS NULL THEN RETURN 'clarify_course_interest'; END IF;
 IF l.pipeline_stage IS NULL OR l.pipeline_stage='new_enquiry' THEN RETURN 'qualify_lead'; END IF;
 RETURN 'send_course_details';
END $$;
CREATE FUNCTION public.lead_operations_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.pipeline_stage='lost' AND nullif(btrim(NEW.lost_reason),'') IS NULL AND
   (TG_OP='INSERT' OR OLD.pipeline_stage IS DISTINCT FROM 'lost' OR NEW.lost_reason IS DISTINCT FROM OLD.lost_reason) THEN
   RAISE EXCEPTION 'A lost reason is required' USING ERRCODE='23514';
 END IF;
 IF NEW.pipeline_stage IS DISTINCT FROM 'lost' THEN NEW.lost_reason:=NULL; END IF;
 NEW.recommended_next_action := public.calculate_lead_next_action(NEW);
 RETURN NEW;
END $$;
CREATE TRIGGER leads_operations BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.lead_operations_before_write();

CREATE FUNCTION public.audit_lead_after_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changes jsonb; k text; old_label text; new_label text;
BEGIN
 IF TG_OP='INSERT' THEN
   PERFORM public.record_lead_activity(NEW.id,'lead_created','Lead created',jsonb_build_object('pipelineStage',NEW.pipeline_stage));
   RETURN NEW;
 END IF;
 SELECT coalesce(jsonb_object_agg(key,jsonb_build_object('from',to_jsonb(OLD)->key,'to',value)),'{}'::jsonb) INTO changes
 FROM jsonb_each(to_jsonb(NEW)) WHERE key IN ('name','email','phone','enquirer_type','student_name','student_age','student_gender','course_interest','education_level','preferred_mode','joining_timeline','joining_preference_details','primary_intent','pipeline_stage','assigned_counsellor_id','consent_to_contact','lost_reason','deleted_at') AND value IS DISTINCT FROM to_jsonb(OLD)->key;
 IF changes ? 'assigned_counsellor_id' THEN
  SELECT coalesce(full_name,email) INTO old_label FROM public.users WHERE id=OLD.assigned_counsellor_id;
  SELECT coalesce(full_name,email) INTO new_label FROM public.users WHERE id=NEW.assigned_counsellor_id;
  changes:=jsonb_set(changes,'{assigned_counsellor_id}',changes->'assigned_counsellor_id' || jsonb_build_object('fromLabel',coalesce(old_label,'Unassigned'),'toLabel',coalesce(new_label,'Unassigned')));
 END IF;
 IF changes <> '{}'::jsonb THEN
   PERFORM public.record_lead_activity(NEW.id,CASE WHEN changes ? 'pipeline_stage' THEN 'stage_changed' WHEN changes ? 'assigned_counsellor_id' THEN 'assignment_changed' WHEN changes ? 'deleted_at' THEN 'lead_deleted' ELSE 'profile_updated' END,'Lead updated',jsonb_build_object('changes',changes));
 END IF;
 IF NEW.consent_to_contact IS FALSE AND OLD.consent_to_contact IS DISTINCT FROM FALSE THEN
   UPDATE public.lead_follow_ups SET status='cancelled',updated_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE lead_id=NEW.id AND deleted_at IS NULL AND status IN ('requested','pending') AND follow_up_type IN ('callback','demo','campus_visit','application_follow_up','send_course_details');
 END IF;
 IF nullif(btrim(NEW.phone),'') IS NULL AND nullif(btrim(OLD.phone),'') IS NOT NULL THEN
   UPDATE public.lead_follow_ups SET status='cancelled',updated_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE lead_id=NEW.id AND deleted_at IS NULL AND status IN ('requested','pending') AND follow_up_type='callback';
 END IF;
 IF nullif(btrim(NEW.email),'') IS NULL AND nullif(btrim(OLD.email),'') IS NOT NULL THEN
   UPDATE public.lead_follow_ups SET status='cancelled',updated_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE lead_id=NEW.id AND deleted_at IS NULL AND status IN ('requested','pending') AND follow_up_type='send_course_details';
 END IF;
 IF NEW.pipeline_stage IN ('enrolled','lost') AND NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
   UPDATE public.lead_follow_ups SET status='cancelled',updated_at=CURRENT_TIMESTAMP AT TIME ZONE 'UTC' WHERE lead_id=NEW.id AND deleted_at IS NULL AND status IN ('requested','pending');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER leads_audit AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_lead_after_write();

CREATE FUNCTION public.guard_request_confirmation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l public.leads;
BEGIN
 SELECT * INTO l FROM public.leads WHERE id=NEW.lead_id FOR UPDATE;
 IF NEW.status='pending' AND (TG_OP='INSERT' OR OLD.status='requested') AND NEW.source_request_id IS NOT NULL THEN
  IF l.pipeline_stage IN ('enrolled','lost') THEN RAISE EXCEPTION 'Reopen the lead before confirming more work' USING ERRCODE='23514'; END IF;
  IF l.deleted_at IS NOT NULL OR l.consent_to_contact IS NOT TRUE THEN RAISE EXCEPTION 'Contact consent is required to confirm this request' USING ERRCODE='23514'; END IF;
  IF (NEW.follow_up_type='callback' AND nullif(btrim(l.phone),'') IS NULL) OR (NEW.follow_up_type='send_course_details' AND nullif(btrim(l.email),'') IS NULL) OR (nullif(btrim(l.phone),'') IS NULL AND nullif(btrim(l.email),'') IS NULL) THEN RAISE EXCEPTION 'Required contact details are missing' USING ERRCODE='23514'; END IF;
  IF NEW.counsellor_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=l.organization_id AND user_id=NEW.counsellor_id) THEN RAISE EXCEPTION 'Choose an organization counsellor to confirm this request' USING ERRCODE='23514'; END IF;
  IF NEW.scheduled_for IS NULL OR NEW.scheduled_for <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC' THEN RAISE EXCEPTION 'Choose a future schedule to confirm this request' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER follow_ups_guard BEFORE INSERT OR UPDATE ON public.lead_follow_ups FOR EACH ROW EXECUTE FUNCTION public.guard_request_confirmation();

CREATE FUNCTION public.audit_follow_up_after_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changes jsonb; event_kind text; old_label text; new_label text;
BEGIN
 IF TG_OP='INSERT' THEN
  event_kind:=CASE WHEN NEW.status='requested' THEN 'request_created' ELSE 'task_created' END;
  changes:=jsonb_build_object('status',jsonb_build_object('from',null,'to',NEW.status),'scheduled_for',jsonb_build_object('from',null,'to',NEW.scheduled_for),'counsellor_id',jsonb_build_object('from',null,'to',NEW.counsellor_id),'notes',jsonb_build_object('from',null,'to',NEW.notes));
 ELSE
  SELECT coalesce(jsonb_object_agg(key,jsonb_build_object('from',to_jsonb(OLD)->key,'to',value)),'{}'::jsonb) INTO changes
  FROM jsonb_each(to_jsonb(NEW)) WHERE key IN ('counsellor_id','follow_up_type','status','scheduled_for','completed_at','outcome','notes','deleted_at') AND value IS DISTINCT FROM to_jsonb(OLD)->key;
  event_kind:=CASE WHEN NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN 'task_deleted'
    WHEN NEW.status='pending' AND OLD.status='requested' THEN 'request_confirmed'
    WHEN NEW.status='requested' AND OLD.status='pending' THEN 'request_reopened'
    WHEN NEW.status='complete' AND OLD.status IS DISTINCT FROM 'complete' THEN 'task_completed'
    WHEN NEW.status='cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN 'task_cancelled'
    ELSE 'task_updated' END;
 END IF;
 IF changes <> '{}'::jsonb THEN
  IF changes ? 'counsellor_id' THEN
   IF TG_OP='UPDATE' THEN SELECT coalesce(full_name,email) INTO old_label FROM public.users WHERE id=OLD.counsellor_id; END IF;
   SELECT coalesce(full_name,email) INTO new_label FROM public.users WHERE id=NEW.counsellor_id;
   changes:=jsonb_set(changes,'{counsellor_id}',changes->'counsellor_id' || jsonb_build_object('fromLabel',coalesce(old_label,'Unassigned'),'toLabel',coalesce(new_label,'Unassigned')));
  END IF;
  PERFORM public.record_lead_activity(NEW.lead_id,event_kind,replace(coalesce(NEW.follow_up_type,'Follow-up'),'_',' '),jsonb_build_object('taskId',NEW.id,'sourceRequestId',NEW.source_request_id,'changes',changes));
  UPDATE public.leads SET recommended_next_action=public.calculate_lead_next_action(leads) WHERE id=NEW.lead_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER follow_ups_audit AFTER INSERT OR UPDATE ON public.lead_follow_ups FOR EACH ROW EXECUTE FUNCTION public.audit_follow_up_after_write();
-- Refresh existing recommendations; no invented activity event for derived fields.
UPDATE public.leads SET recommended_next_action=public.calculate_lead_next_action(leads) WHERE deleted_at IS NULL;

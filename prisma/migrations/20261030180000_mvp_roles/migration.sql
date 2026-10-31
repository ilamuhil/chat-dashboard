-- Preserve existing administrative access, as explicitly requested.
UPDATE public.organization_members SET role='owner' WHERE role='admin';
UPDATE public.organization_members SET role='counsellor' WHERE role='editor';
UPDATE public.organization_invites SET role='owner' WHERE role='admin';
UPDATE public.organization_invites SET role='counsellor' WHERE role='editor';
ALTER TABLE public.organization_invites ALTER COLUMN role SET DEFAULT 'counsellor';
ALTER TABLE public.organization_members ADD CONSTRAINT organization_member_role CHECK (role IN ('owner','admin','counsellor','viewer')) NOT VALID;
ALTER TABLE public.organization_invites ADD CONSTRAINT organization_invite_role CHECK (role IN ('owner','admin','counsellor','viewer')) NOT VALID;
CREATE OR REPLACE FUNCTION public.guard_last_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW.role IS DISTINCT FROM 'owner') THEN
  PERFORM id FROM public.organizations WHERE id=OLD.organization_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id=OLD.organization_id) AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=OLD.organization_id AND role='owner' AND id<>OLD.id) THEN
   RAISE EXCEPTION 'The last Owner cannot be removed or demoted' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER members_keep_owner BEFORE DELETE OR UPDATE OF role ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.guard_last_owner();

CREATE OR REPLACE FUNCTION public.emit_lead_alert(org text, owner_id uuid, kind text, alert_title text, alert_body text, details jsonb, event_prefix text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.notifications(id, organization_id, user_id, title, body, type, metadata, channels, event_key)
  SELECT gen_random_uuid(), org, m.user_id, alert_title, alert_body, kind, details,
    '{"dashboard":true,"email":"pending","attempts":0}'::jsonb, event_prefix || ':' || m.user_id
  FROM public.organization_members m
  WHERE m.organization_id = org AND m.user_id IS NOT NULL
    AND ((owner_id IS NOT NULL AND m.user_id = owner_id) OR
      (NOT EXISTS (SELECT 1 FROM public.organization_members o WHERE o.organization_id = org AND o.user_id = owner_id) AND m.role IN ('owner','admin')))
  ON CONFLICT(event_key) DO NOTHING;
$$;
CREATE OR REPLACE FUNCTION public.unassign_departed_counsellor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.leads SET assigned_counsellor_id = NULL WHERE organization_id = OLD.organization_id AND assigned_counsellor_id = OLD.user_id;
  UPDATE public.lead_follow_ups f SET counsellor_id = NULL FROM public.leads l WHERE f.lead_id = l.id AND l.organization_id = OLD.organization_id AND f.counsellor_id = OLD.user_id;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER members_unassign_viewer BEFORE UPDATE OF role ON public.organization_members FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role AND NEW.role='viewer') EXECUTE FUNCTION public.unassign_departed_counsellor();

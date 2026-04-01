
DROP VIEW IF EXISTS public.dojo_integrations_safe;

CREATE VIEW public.dojo_integrations_safe
WITH (security_invoker = true)
AS SELECT id, dojo_id, integration_type, is_enabled, created_at, updated_at
FROM public.dojo_integrations;

-- 1. Migrar todos os usuários super_admin para admin
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE role = 'super_admin'::app_role;

-- 2. Remover a função is_super_admin (não será mais necessária)
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);

-- 3. Atualizar políticas RLS que usam super_admin para usar admin
-- Drop e recriar políticas do dojos
DROP POLICY IF EXISTS "Super admins manage dojos" ON public.dojos;
DROP POLICY IF EXISTS "Owners can manage dojos" ON public.dojos;

CREATE POLICY "Owners can manage dojos" 
ON public.dojos 
FOR ALL 
USING (has_role(auth.uid(), 'dono'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Drop e recriar políticas do dojo_owners  
DROP POLICY IF EXISTS "Super admins manage dojo owners" ON public.dojo_owners;
DROP POLICY IF EXISTS "Super admins can manage dojo_owners" ON public.dojo_owners;

CREATE POLICY "Admins can manage dojo_owners" 
ON public.dojo_owners 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop e recriar políticas do dojo_senseis
DROP POLICY IF EXISTS "Super admins manage dojo senseis" ON public.dojo_senseis;

-- Já existe política para owners/admin, então não precisa recriar

-- Drop e recriar políticas do dojo_users
DROP POLICY IF EXISTS "Owners can manage dojo_users" ON public.dojo_users;

CREATE POLICY "Owners can manage dojo_users" 
ON public.dojo_users 
FOR ALL 
USING (has_role(auth.uid(), 'dono'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
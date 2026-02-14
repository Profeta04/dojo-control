
-- 1. Adicionar campo de categoria nos pagamentos (com categorias pré-definidas)
CREATE TYPE public.payment_category AS ENUM (
  'mensalidade',
  'material',
  'taxa_exame',
  'evento',
  'matricula',
  'outro'
);

ALTER TABLE public.payments 
ADD COLUMN category public.payment_category NOT NULL DEFAULT 'mensalidade';

-- 2. Adicionar campos de multa/juros nos dojos
ALTER TABLE public.dojos
ADD COLUMN late_fee_percent numeric NOT NULL DEFAULT 0,
ADD COLUMN daily_interest_percent numeric NOT NULL DEFAULT 0,
ADD COLUMN grace_days integer NOT NULL DEFAULT 0;

-- 3. Adicionar campo de bloqueio no perfil do aluno
ALTER TABLE public.profiles
ADD COLUMN is_blocked boolean NOT NULL DEFAULT false,
ADD COLUMN blocked_reason text;


-- Add new belt grades for kids
ALTER TYPE public.belt_grade ADD VALUE IF NOT EXISTS 'bordo' BEFORE 'cinza';
ALTER TYPE public.belt_grade ADD VALUE IF NOT EXISTS 'azul_escura' BEFORE 'azul';

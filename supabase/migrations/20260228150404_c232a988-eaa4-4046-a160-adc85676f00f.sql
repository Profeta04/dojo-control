-- Add tip belt grades to the belt_grade enum
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'branca_ponta_bordo';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'bordo_ponta_cinza';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'cinza_ponta_azul_escura';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'azul_escura_ponta_azul';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'azul_ponta_amarela';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'amarela_ponta_laranja';
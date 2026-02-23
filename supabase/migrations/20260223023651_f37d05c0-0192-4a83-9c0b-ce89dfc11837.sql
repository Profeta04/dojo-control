-- Add BJJ-specific intermediate belt grades to the belt_grade enum
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'cinza_branca';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'cinza_preta';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'amarela_branca';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'amarela_preta';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'laranja_branca';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'laranja_preta';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'verde_branca';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'verde_preta';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'coral';
ALTER TYPE belt_grade ADD VALUE IF NOT EXISTS 'vermelha';


-- Add degree column to student_belts for BJJ grau system
ALTER TABLE public.student_belts ADD COLUMN degree integer NOT NULL DEFAULT 0;

-- Add degree column to graduation_history to track degree changes
ALTER TABLE public.graduation_history ADD COLUMN to_degree integer NOT NULL DEFAULT 0;
ALTER TABLE public.graduation_history ADD COLUMN from_degree integer NOT NULL DEFAULT 0;

-- Add constraint: degree must be between 0 and 4
ALTER TABLE public.student_belts ADD CONSTRAINT student_belts_degree_check CHECK (degree >= 0 AND degree <= 4);
ALTER TABLE public.graduation_history ADD CONSTRAINT graduation_history_to_degree_check CHECK (to_degree >= 0 AND to_degree <= 4);
ALTER TABLE public.graduation_history ADD CONSTRAINT graduation_history_from_degree_check CHECK (from_degree >= 0 AND from_degree <= 4);

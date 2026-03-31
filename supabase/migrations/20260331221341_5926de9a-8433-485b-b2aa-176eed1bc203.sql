
-- Add space_type enum
CREATE TYPE public.space_type AS ENUM ('family', 'indivision', 'sci', 'personal', 'multi_family');

-- Add columns to families table
ALTER TABLE public.families
  ADD COLUMN type public.space_type NOT NULL DEFAULT 'family',
  ADD COLUMN description text,
  ADD COLUMN ownership_enabled boolean NOT NULL DEFAULT false;

-- Extend family_role enum with legal_representative
ALTER TYPE public.family_role ADD VALUE IF NOT EXISTS 'legal_representative';

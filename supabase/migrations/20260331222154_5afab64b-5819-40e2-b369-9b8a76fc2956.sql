
-- Drop existing role constraint and re-create with extended roles
ALTER TABLE public.house_members DROP CONSTRAINT IF EXISTS house_members_role_check;
ALTER TABLE public.house_members 
  ADD CONSTRAINT house_members_role_check 
  CHECK (role IN ('admin', 'member', 'guest', 'editor', 'viewer', 'maintenance'));

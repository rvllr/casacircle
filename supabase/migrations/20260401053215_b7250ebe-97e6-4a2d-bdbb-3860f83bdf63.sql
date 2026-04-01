
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC NOT NULL DEFAULT 0,
  max_spaces INTEGER NOT NULL DEFAULT 1,
  max_houses_per_space INTEGER NOT NULL DEFAULT 1,
  max_members_per_space INTEGER NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Space subscriptions table
CREATE TABLE public.space_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'trial', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id)
);

-- Subscription add-ons table
CREATE TABLE public.subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Space add-ons relation
CREATE TABLE public.space_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.subscription_addons(id),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_id, addon_id)
);

-- RLS for subscription_plans (public read)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);

-- RLS for space_subscriptions
ALTER TABLE public.space_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Space members can view subscription" ON public.space_subscriptions FOR SELECT TO authenticated USING (is_family_member(auth.uid(), space_id));
CREATE POLICY "Space admins can manage subscription" ON public.space_subscriptions FOR INSERT TO authenticated WITH CHECK (is_family_admin(auth.uid(), space_id));
CREATE POLICY "Space admins can update subscription" ON public.space_subscriptions FOR UPDATE TO authenticated USING (is_family_admin(auth.uid(), space_id));

-- RLS for subscription_addons (public read)
ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active addons" ON public.subscription_addons FOR SELECT USING (is_active = true);

-- RLS for space_addons
ALTER TABLE public.space_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Space members can view addons" ON public.space_addons FOR SELECT TO authenticated USING (is_family_member(auth.uid(), space_id));
CREATE POLICY "Space admins can manage addons" ON public.space_addons FOR INSERT TO authenticated WITH CHECK (is_family_admin(auth.uid(), space_id));
CREATE POLICY "Space admins can delete addons" ON public.space_addons FOR DELETE TO authenticated USING (is_family_admin(auth.uid(), space_id));

-- Seed default plans
INSERT INTO public.subscription_plans (name, code, monthly_price, yearly_price, max_spaces, max_houses_per_space, max_members_per_space, features) VALUES
('Starter', 'starter', 0, 0, 1, 1, 5, '{"planning": true, "checklists": true, "souvenirs": true, "documents_simple": true, "shared_expenses": false, "maintenance": false, "weighted_votes": false, "ownership_shares": false, "financial_dashboard": false, "decision_register": false, "fairness_score": false, "notary_export": false, "votes_simple": false, "timeline": false}'::jsonb),
('Family', 'family', 9, 90, 1, 3, 999, '{"planning": true, "checklists": true, "souvenirs": true, "documents_simple": true, "shared_expenses": true, "maintenance": true, "votes_simple": true, "timeline": true, "checklists_avancees": true, "weighted_votes": false, "ownership_shares": false, "financial_dashboard": false, "decision_register": false, "fairness_score": false, "notary_export": false}'::jsonb),
('Patrimoine', 'patrimoine', 24, 240, 1, 999, 999, '{"planning": true, "checklists": true, "souvenirs": true, "documents_simple": true, "shared_expenses": true, "maintenance": true, "votes_simple": true, "timeline": true, "checklists_avancees": true, "weighted_votes": true, "ownership_shares": true, "financial_dashboard": true, "decision_register": true, "fairness_score": true, "notary_export": true}'::jsonb),
('Multi-space', 'multi_space', 39, 390, 999, 999, 999, '{"planning": true, "checklists": true, "souvenirs": true, "documents_simple": true, "shared_expenses": true, "maintenance": true, "votes_simple": true, "timeline": true, "checklists_avancees": true, "weighted_votes": true, "ownership_shares": true, "financial_dashboard": true, "decision_register": true, "fairness_score": true, "notary_export": true}'::jsonb);

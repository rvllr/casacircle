import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  monthly_price: number;
  yearly_price: number;
  max_spaces: number;
  max_houses_per_space: number;
  max_members_per_space: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface SpaceSubscription {
  id: string;
  space_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  plan?: SubscriptionPlan;
}

export const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  family: "Family",
  patrimoine: "Patrimoine",
  multi_space: "Multi-space",
};

export const PLAN_COLORS: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  family: "bg-primary/10 text-primary",
  patrimoine: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  multi_space: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export const FEATURE_LABELS: Record<string, string> = {
  planning: "Planning partagé",
  checklists: "Checklists",
  souvenirs: "Souvenirs & album",
  documents_simple: "Documents simples",
  shared_expenses: "Dépenses partagées",
  maintenance: "Tickets maintenance",
  votes_simple: "Votes simples",
  timeline: "Timeline historique",
  checklists_avancees: "Checklists avancées",
  weighted_votes: "Votes pondérés",
  ownership_shares: "Quotes-parts propriété",
  financial_dashboard: "Dashboard financier",
  decision_register: "Registre des décisions",
  fairness_score: "Score d'équité",
  notary_export: "Export notaire",
};

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("monthly_price", { ascending: true });
  return (data as SubscriptionPlan[]) || [];
}

export async function fetchSpaceSubscription(spaceId: string): Promise<SpaceSubscription | null> {
  const { data } = await supabase
    .from("space_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("space_id", spaceId)
    .maybeSingle();
  return data as SpaceSubscription | null;
}

export function isFeatureEnabled(plan: SubscriptionPlan | undefined, feature: string): boolean {
  if (!plan) return false;
  return !!plan.features[feature];
}

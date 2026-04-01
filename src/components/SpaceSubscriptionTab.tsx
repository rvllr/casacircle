import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, CreditCard, Building2, Users, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  SubscriptionPlan, SpaceSubscription,
  fetchPlans, fetchSpaceSubscription,
  PLAN_LABELS, PLAN_COLORS, FEATURE_LABELS,
} from "@/lib/subscriptions";

interface Props {
  spaceId: string;
  isAdmin: boolean;
  housesCount: number;
  membersCount: number;
}

const SpaceSubscriptionTab = ({ spaceId, isAdmin, housesCount, membersCount }: Props) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [sub, setSub] = useState<SpaceSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, s] = await Promise.all([fetchPlans(), fetchSpaceSubscription(spaceId)]);
      setPlans(p);
      setSub(s);
      setLoading(false);
    })();
  }, [spaceId]);

  const currentPlan = sub?.plan as SubscriptionPlan | undefined ?? plans.find(p => p.code === "starter");

  const handleUpgrade = async (planId: string) => {
    if (!sub) {
      await supabase.from("space_subscriptions").insert({
        space_id: spaceId,
        plan_id: planId,
        status: "active",
        created_by_user_id: (await supabase.auth.getUser()).data.user?.id,
      });
    } else {
      await supabase.from("space_subscriptions").update({ plan_id: planId }).eq("id", sub.id);
    }
    const s = await fetchSpaceSubscription(spaceId);
    setSub(s);
    setUpgradeOpen(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement…</div>;

  const maxH = currentPlan?.max_houses_per_space ?? 1;
  const maxM = currentPlan?.max_members_per_space ?? 5;
  const housePct = maxH >= 999 ? 0 : Math.min((housesCount / maxH) * 100, 100);
  const memberPct = maxM >= 999 ? 0 : Math.min((membersCount / maxM) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Plan actuel
            <Badge className={`ml-2 border-0 ${PLAN_COLORS[currentPlan?.code ?? "starter"]}`}>
              {PLAN_LABELS[currentPlan?.code ?? "starter"]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Maisons
                </span>
                <span className="font-medium">{housesCount} / {maxH >= 999 ? "∞" : maxH}</span>
              </div>
              {maxH < 999 && <Progress value={housePct} className="h-2" />}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" /> Membres
                </span>
                <span className="font-medium">{membersCount} / {maxM >= 999 ? "∞" : maxM}</span>
              </div>
              {maxM < 999 && <Progress value={memberPct} className="h-2" />}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Fonctionnalités incluses</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                const enabled = currentPlan?.features[key];
                return (
                  <div key={key} className={`flex items-center gap-2 text-sm ${enabled ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {enabled ? <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto rounded-xl gap-2">
                  <Sparkles className="h-4 w-4" /> Changer de plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Choisir un plan</DialogTitle>
                </DialogHeader>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {plans.map((plan) => {
                    const isCurrent = currentPlan?.id === plan.id;
                    return (
                      <Card key={plan.id} className={`border-border/50 shadow-soft relative ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                        {isCurrent && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] border-0">Actuel</Badge>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div className="text-center">
                            <Badge className={`border-0 mb-2 ${PLAN_COLORS[plan.code]}`}>{plan.name}</Badge>
                            <p className="text-2xl font-display text-foreground">
                              {plan.monthly_price === 0 ? "Gratuit" : `${plan.monthly_price}€`}
                              {plan.monthly_price > 0 && <span className="text-xs text-muted-foreground font-body">/mois</span>}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>• {plan.max_houses_per_space >= 999 ? "Maisons illimitées" : `${plan.max_houses_per_space} maison${plan.max_houses_per_space > 1 ? "s" : ""}`}</p>
                            <p>• {plan.max_members_per_space >= 999 ? "Membres illimités" : `${plan.max_members_per_space} membres`}</p>
                          </div>
                          <div className="text-xs space-y-0.5">
                            {Object.entries(FEATURE_LABELS).slice(0, 6).map(([k, l]) => (
                              <div key={k} className={`flex items-center gap-1 ${plan.features[k] ? "text-foreground" : "text-muted-foreground/40"}`}>
                                {plan.features[k] ? <CheckCircle2 className="h-3 w-3 text-accent" /> : <XCircle className="h-3 w-3" />}
                                <span>{l}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant={isCurrent ? "outline" : "default"}
                            size="sm"
                            className="w-full rounded-xl"
                            disabled={isCurrent}
                            onClick={() => handleUpgrade(plan.id)}
                          >
                            {isCurrent ? "Plan actuel" : "Choisir"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpaceSubscriptionTab;

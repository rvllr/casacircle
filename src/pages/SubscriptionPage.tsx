import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fetchPlans, fetchSpaceSubscription, SubscriptionPlan, SpaceSubscription, PLAN_LABELS, PLAN_COLORS, FEATURE_LABELS } from "@/lib/subscriptions";
import { useActiveSpace } from "@/contexts/ActiveSpaceContext";
import { AppLayout } from "@/components/AppLayout";

const SubscriptionPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<SpaceSubscription | null>(null);
  const [yearly, setYearly] = useState(false);
  const { activeSpaceId } = useActiveSpace();

  useEffect(() => {
    fetchPlans().then(setPlans);
  }, []);

  useEffect(() => {
    if (activeSpaceId) {
      fetchSpaceSubscription(activeSpaceId).then(setCurrentSub);
    } else {
      setCurrentSub(null);
    }
  }, [activeSpaceId]);

  const currentPlanCode = currentSub?.plan?.code;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
            Abonnement
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez votre plan actuel et comparez les offres disponibles.
          </p>
        </div>

        {/* Current plan banner */}
        {currentSub?.plan && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Plan actuel</p>
                  <p className="text-lg font-display text-foreground">
                    {PLAN_LABELS[currentSub.plan.code] || currentSub.plan.name}
                  </p>
                </div>
                <Badge className={`border-0 ${PLAN_COLORS[currentSub.plan.code] || ""}`}>
                  {currentSub.status === "active" ? "Actif" : currentSub.status === "trial" ? "Essai" : currentSub.status}
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!activeSpaceId && (
          <Card>
            <CardContent className="p-5 text-center text-muted-foreground">
              Sélectionnez un espace patrimoine pour voir votre abonnement actuel.
            </CardContent>
          </Card>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>Mensuel</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${yearly ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm ${yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Annuel <Badge variant="secondary" className="text-[10px] ml-1">-17%</Badge>
          </span>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const isCurrent = plan.code === currentPlanCode;
            const popular = plan.code === "patrimoine";
            const price = yearly ? plan.yearly_price / 12 : plan.monthly_price;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className={`border-border/50 shadow-soft relative h-full ${popular ? "ring-2 ring-primary" : ""} ${isCurrent ? "ring-2 ring-accent" : ""}`}>
                  {popular && !isCurrent && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 shadow-soft">Populaire</Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 bg-accent text-accent-foreground shadow-soft">
                      Plan actuel
                    </Badge>
                  )}
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="text-center mb-4">
                      <Badge className={`border-0 mb-3 ${PLAN_COLORS[plan.code]}`}>{PLAN_LABELS[plan.code]}</Badge>
                      <p className="text-3xl font-display text-foreground">
                        {price === 0 ? "Gratuit" : `${Math.round(price)}€`}
                        {price > 0 && <span className="text-sm text-muted-foreground font-body">/mois</span>}
                      </p>
                      {yearly && plan.yearly_price > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.yearly_price}€/an</p>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1 mb-4">
                      <p>• {plan.max_houses_per_space >= 999 ? "Maisons illimitées" : `${plan.max_houses_per_space} maison${plan.max_houses_per_space > 1 ? "s" : ""}`}</p>
                      <p>• {plan.max_members_per_space >= 999 ? "Membres illimités" : `${plan.max_members_per_space} membres`}</p>
                      <p>• {plan.max_spaces >= 999 ? "Espaces illimités" : `${plan.max_spaces} espace`}</p>
                    </div>

                    <div className="flex-1 space-y-1.5 mb-5">
                      {Object.entries(FEATURE_LABELS).map(([k, l]) => (
                        <div key={k} className={`flex items-center gap-1.5 text-xs ${plan.features[k] ? "text-foreground" : "text-muted-foreground/40"}`}>
                          {plan.features[k] ? <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                          {l}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={isCurrent ? "secondary" : popular ? "default" : "outline"}
                      className="w-full rounded-xl group"
                      disabled={isCurrent}
                    >
                      {isCurrent ? "Plan actuel" : price === 0 ? "Commencer gratuitement" : "Choisir ce plan"}
                      {!isCurrent && <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default SubscriptionPage;

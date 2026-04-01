import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fetchPlans, SubscriptionPlan, PLAN_LABELS, PLAN_COLORS, FEATURE_LABELS } from "@/lib/subscriptions";
import logoCasaCircle from "@/assets/logo-casacircle.png";

const PricingPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    fetchPlans().then(setPlans);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoCasaCircle} alt="CasaCircle" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-xl" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button size="sm" className="rounded-xl shadow-soft" asChild>
              <Link to="/signup">Créer mon espace</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-display text-foreground tracking-tight mb-3">
              Un plan pour chaque famille
            </h1>
            <p className="text-lg text-muted-foreground">
              Commencez gratuitement, évoluez selon vos besoins patrimoniaux.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
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
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {plans.map((plan, i) => {
              const popular = plan.code === "patrimoine";
              const price = yearly ? plan.yearly_price / 12 : plan.monthly_price;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`border-border/50 shadow-soft relative h-full ${popular ? "ring-2 ring-primary" : ""}`}>
                    {popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 shadow-soft">Populaire</Badge>
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
                        variant={popular ? "default" : "outline"}
                        className="w-full rounded-xl group"
                        asChild
                      >
                        <Link to="/signup">
                          {price === 0 ? "Commencer gratuitement" : "Choisir ce plan"}
                          <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;

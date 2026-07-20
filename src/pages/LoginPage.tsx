import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoCasaCircle from "@/assets/logo-casacircle.png";
import { friendlyError } from "@/lib/errorMessages";

// Validate that `next` is a same-origin relative path (starts with a single "/").
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const nextParam = safeNext(params.get("next"));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur de connexion", description: friendlyError(error), variant: "destructive" });
    } else {
      navigate(nextParam ?? "/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Warm decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] warm-gradient relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-center px-12 xl:px-16">
          <div className="space-y-6 max-w-md">
            <div className="h-14 w-auto rounded-2xl flex items-center justify-start">
              <img src={logoCasaCircle} alt="CasaCircle" className="h-14 w-auto" />
            </div>
            <h2 className="text-3xl xl:text-4xl font-display text-foreground leading-tight">
              Retrouvez votre maison familiale en quelques clics.
            </h2>
            <p className="text-muted-foreground text-lg">
              Planning, réservations, souvenirs — tout est centralisé pour votre famille.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {["🏡", "👨‍👩‍👧‍👦", "📅"].map((emoji, i) =>
                <div key={i} className="h-10 w-10 rounded-full bg-card border-2 border-background flex items-center justify-center text-lg shadow-soft">
                    {emoji}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Rejoignez les familles qui s'organisent sereinement.
              </p>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-primary/5" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/5" />
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <img src={logoCasaCircle} alt="CasaCircle" className="h-10 w-auto" />
              
            </Link>
            <h1 className="text-2xl font-display text-foreground pt-4">Bon retour parmi nous</h1>
            <p className="text-sm text-muted-foreground">Connectez-vous à votre espace familial</p>
          </div>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className="h-11 rounded-xl" />
                  
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">Mot de passe oublié ?</Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 rounded-xl" />
                  
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-sm font-medium group" disabled={loading}>
                  {loading ? "Connexion..." :
                  <>
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  }
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : "/signup"} className="text-primary hover:underline font-medium">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>);

};

export default LoginPage;
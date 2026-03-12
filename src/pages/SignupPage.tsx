import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoCasaCircle from "@/assets/logo-casacircle.png";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName }
      }
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Compte créé !", description: "Vérifiez votre email pour confirmer votre compte." });
      navigate("/login");
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
              Créez votre espace familial en quelques minutes.
            </h2>
            <p className="text-muted-foreground text-lg">
              Invitez votre famille, organisez les séjours et gardez vos souvenirs précieusement.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
              { emoji: "🏠", label: "Vos maisons" },
              { emoji: "📅", label: "Planning partagé" },
              { emoji: "💛", label: "Souvenirs" }].
              map((item) =>
              <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/40">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs text-muted-foreground text-center">{item.label}</span>
                </div>
              )}
            </div>
          </div>
        </div>
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
            <h1 className="text-2xl font-display text-foreground pt-4">Créer un compte</h1>
            <p className="text-sm text-muted-foreground">Rejoignez votre famille sur CasaCircle</p>
          </div>

          <Card className="shadow-card border-border/60">
            <CardContent className="p-6">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">Prénom</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jean" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Nom</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Dupont" className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-sm font-medium group" disabled={loading}>
                  {loading ? "Création..." :
                  <>
                      Créer mon compte
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  }
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>);

};

export default SignupPage;
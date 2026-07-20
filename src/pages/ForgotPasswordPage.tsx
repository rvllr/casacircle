import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoCasaCircle from "@/assets/logo-casacircle.png";
import { friendlyError } from "@/lib/errorMessages";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img src={logoCasaCircle} alt="CasaCircle" className="h-10 w-auto" />
            
          </Link>
          <h1 className="text-2xl font-display text-foreground pt-4">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">Recevez un lien de réinitialisation par email</p>
        </div>

        <Card className="shadow-card border-border/60">
          <CardContent className="p-6">
            {sent ?
            <div className="text-center space-y-4 py-2">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6 text-accent" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Un email de réinitialisation a été envoyé à <strong className="text-foreground">{email}</strong>.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full rounded-xl">Retour à la connexion</Button>
                </Link>
              </div> :

            <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </Button>
              </form>
            }
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Retour à la connexion</Link>
        </p>
      </div>
    </div>);

};

export default ForgotPasswordPage;
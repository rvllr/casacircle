import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Home, ArrowRight } from "lucide-react";

const JoinHousePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || !user) return;

    setLoading(true);
    // L'identité de l'appelant est désormais résolue côté serveur via auth.uid().
    const { data, error } = await (supabase.rpc as any)("join_house_by_code", {
      _join_code: trimmed,
    });

    if (error) {
      const msg = error.message || "";
      toast({
        title: "Impossible de rejoindre",
        description: msg.includes("Code invalide")
          ? "Code invalide. Vérifiez le code et réessayez."
          : msg.includes("déjà membre")
          ? "Vous êtes déjà membre de cette maison."
          : "Impossible de rejoindre cette maison.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Bienvenue ! 🏡", description: "Vous avez rejoint la maison avec succès." });
      navigate(`/houses/${data}`);
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-border/50 shadow-soft">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Rejoindre une maison</CardTitle>
            <CardDescription>
              Entrez le code d'invitation partagé par un membre de la famille
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CASA-A1B2C3"
                  className="text-center text-lg font-mono tracking-widest h-12"
                  maxLength={20}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11 group" disabled={loading || !code.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Home className="h-4 w-4 mr-2" />
                )}
                Rejoindre la maison
                {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default JoinHousePage;

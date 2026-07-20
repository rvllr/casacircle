import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import logoCasaCircle from "@/assets/logo-casacircle.png";

// Local type shim for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_name?: string; logo_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("authorization_id manquant dans l'URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Aucune URL de redirection retournée par le serveur d'autorisation.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "une application";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle className="font-display">Autorisation impossible</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground break-words">{error}</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Retour au tableau de bord</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la demande d'autorisation…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md shadow-card border-border/60">
        <CardHeader className="text-center space-y-3">
          <img src={logoCasaCircle} alt="CasaCircle" className="h-10 w-auto mx-auto" />
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-xl">
              Connecter {clientName} à votre compte
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {clientName} pourra utiliser les outils CasaCircle en votre nom pendant que vous êtes connecté.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-secondary/40 p-4 space-y-2 text-sm">
            <p className="font-medium">Accès demandé :</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Partager votre profil et adresse e-mail</li>
              <li>Utiliser les outils exposés par CasaCircle (biens, réservations, dépenses…)</li>
              {scopes
                .filter((s) => !["openid", "email", "profile"].includes(s))
                .map((s) => (
                  <li key={s}>Permission supplémentaire : {s}</li>
                ))}
            </ul>
            <p className="text-xs text-muted-foreground pt-2">
              Cela ne contourne pas les règles d'accès de l'application : vos droits restent identiques.
            </p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 h-11 rounded-xl" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Autoriser"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Refuser
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

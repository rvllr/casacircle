import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="font-display text-xl text-foreground">Maison Commune</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <h1 className="text-3xl font-display text-foreground mb-2">Bienvenue 👋</h1>
        <p className="text-muted-foreground mb-8">Votre espace familial vous attend.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-lg text-foreground">Mes maisons</h2>
            <p className="text-sm text-muted-foreground">Aucune maison pour le moment.</p>
            <Button size="sm">Créer une maison</Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-lg text-foreground">Prochaines réservations</h2>
            <p className="text-sm text-muted-foreground">Aucune réservation à venir.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-display text-lg text-foreground">Derniers souvenirs</h2>
            <p className="text-sm text-muted-foreground">Le journal est vide pour le moment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

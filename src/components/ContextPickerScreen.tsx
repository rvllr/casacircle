import { useActiveSpace } from "@/contexts/ActiveSpaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Briefcase, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SPACE_ICONS: Record<string, string> = {
  sci: "🏢",
  family: "👨‍👩‍👧",
  indivision: "⚖️",
  personal: "🏠",
  multi_family: "🏘️",
};

export default function ContextPickerScreen() {
  const { spaces, directHouses, selectSpace, selectHouse } = useActiveSpace();
  const navigate = useNavigate();

  const hasSpaces = spaces.length > 0;
  const hasHouses = directHouses.length > 0;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-8 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
          Choisissez votre espace
        </h2>
        <p className="text-muted-foreground">
          Sélectionnez un espace patrimoine ou un bien pour commencer.
        </p>
      </div>

      {hasSpaces && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Espaces patrimoine
          </h3>
          <div className="grid gap-3">
            {spaces.map((space) => (
              <Card
                key={space.id}
                className="border-border/50 shadow-soft hover:shadow-card hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                onClick={() => selectSpace(space.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <span className="text-2xl">{SPACE_ICONS[space.type] || "🏠"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {space.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {space.type === "sci" ? "SCI" : space.type === "family" ? "Famille" : space.type === "indivision" ? "Indivision" : space.type === "multi_family" ? "Multi-famille" : "Personnel"}
                    </p>
                  </div>
                  <span className="text-muted-foreground/40 group-hover:text-primary transition-colors">→</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hasHouses && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Accès directs à des biens
          </h3>
          <div className="grid gap-3">
            {directHouses.map((house) => (
              <Card
                key={house.id}
                className="border-border/50 shadow-soft hover:shadow-card hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                onClick={() => selectHouse(house.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <span className="text-2xl">🏠</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {house.name}
                    </p>
                    {house.location && (
                      <p className="text-xs text-muted-foreground truncate">{house.location}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground/40 group-hover:text-primary transition-colors">→</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!hasSpaces && !hasHouses && (
        <div className="text-center space-y-4 py-8">
          <p className="text-muted-foreground">Vous n'avez encore aucun accès.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate("/spaces")}>
          <Plus className="h-4 w-4" />
          Créer un espace
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate("/rejoindre")}>
          <KeyRound className="h-4 w-4" />
          Rejoindre un espace
        </Button>
      </div>
    </div>
  );
}

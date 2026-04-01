import { useActiveSpace } from "@/contexts/ActiveSpaceContext";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { Building2, ChevronDown, Globe, Plus, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SPACE_ICONS: Record<string, string> = {
  sci: "🏢",
  family: "👨‍👩‍👧",
  indivision: "⚖️",
  personal: "🏠",
  multi_family: "🏘️",
};

export default function SpaceSelectorDropdown() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const {
    activeType,
    activeSpaceId,
    activeHouseId,
    spaces,
    directHouses,
    activeLabel,
    activeIcon,
    selectSpace,
    selectHouse,
    clearSelection,
    loading,
  } = useActiveSpace();

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 transition-all duration-200 text-left w-full",
            collapsed ? "p-2 justify-center" : "px-3 py-2.5"
          )}
        >
          <span className="text-base flex-shrink-0">{activeIcon}</span>
          {!collapsed && (
            <>
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {activeLabel}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" sideOffset={4}>
        {/* All spaces option */}
        <DropdownMenuItem
          onClick={clearSelection}
          className={cn("gap-2", !activeType && "bg-primary/10 text-primary")}
        >
          <Globe className="h-4 w-4" />
          Tous les espaces
        </DropdownMenuItem>

        {/* Patrimony spaces */}
        {spaces.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
              Espaces patrimoine
            </DropdownMenuLabel>
            {spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                onClick={() => selectSpace(space.id)}
                className={cn(
                  "gap-2",
                  activeType === "space" && activeSpaceId === space.id && "bg-primary/10 text-primary"
                )}
              >
                <span className="text-sm">{SPACE_ICONS[space.type] || "🏠"}</span>
                {space.name}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Direct houses */}
        {directHouses.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
              Accès partiels à des biens
            </DropdownMenuLabel>
            {directHouses.map((house) => (
              <DropdownMenuItem
                key={house.id}
                onClick={() => selectHouse(house.id)}
                className={cn(
                  "gap-2",
                  activeType === "house" && activeHouseId === house.id && "bg-primary/10 text-primary"
                )}
              >
                <Building2 className="h-4 w-4" />
                {house.name}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Actions */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/spaces")} className="gap-2 text-primary">
          <Plus className="h-4 w-4" />
          Créer un espace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/rejoindre")} className="gap-2 text-primary">
          <KeyRound className="h-4 w-4" />
          Rejoindre un espace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

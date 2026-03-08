import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHouseContext } from "@/contexts/HouseContext";

const HouseSelector = () => {
  const { houses, selectedHouseId, setSelectedHouseId } = useHouseContext();

  if (houses.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
        <SelectTrigger className="w-64 rounded-xl border-border/60 h-10">
          <SelectValue placeholder="Sélectionner une maison" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all">Toutes les maisons</SelectItem>
          {houses.map((h) => (
            <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default HouseSelector;

import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHouseContext } from "@/contexts/HouseContext";

const HouseSelector = () => {
  const { houses, selectedHouseId, setSelectedHouseId } = useHouseContext();

  if (houses.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedHouseId} onValueChange={setSelectedHouseId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Sélectionner une maison" />
        </SelectTrigger>
        <SelectContent>
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

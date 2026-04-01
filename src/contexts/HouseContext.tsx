import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useActiveSpace } from "@/contexts/ActiveSpaceContext";
import { DEMO_HOUSES } from "@/lib/demoData";

interface House {
  id: string;
  name: string;
  family_id: string | null;
}

interface HouseContextType {
  houses: House[];
  selectedHouseId: string;
  setSelectedHouseId: (id: string) => void;
  selectedHouse: House | null;
  loading: boolean;
  refetchHouses: () => void;
}

const HouseContext = createContext<HouseContextType>({
  houses: [],
  selectedHouseId: "all",
  setSelectedHouseId: () => {},
  selectedHouse: null,
  loading: true,
  refetchHouses: () => {},
});

export const useHouseContext = () => useContext(HouseContext);

export const HouseProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { getFilteredHouseIds, activeType, activeSpaceId, activeHouseId } = useActiveSpace();
  const [allHouses, setAllHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchHouses = useCallback(async () => {
    if (isDemo) {
      setAllHouses(DEMO_HOUSES);
      setLoading(false);
      return;
    }
    if (!user) {
      setAllHouses([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("houses").select("id, name, family_id");
    setAllHouses(data || []);
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

  // Filter houses based on active space context
  const houses = (() => {
    const filteredIds = getFilteredHouseIds();
    if (!filteredIds) return allHouses;
    return allHouses.filter(h => filteredIds.includes(h.id));
  })();

  // Reset selected house when context changes
  useEffect(() => {
    if (houses.length === 1) {
      setSelectedHouseId(houses[0].id);
    } else {
      setSelectedHouseId("all");
    }
  }, [activeType, activeSpaceId, activeHouseId, houses.length]);

  const selectedHouse = selectedHouseId === "all"
    ? null
    : houses.find((h) => h.id === selectedHouseId) || null;

  return (
    <HouseContext.Provider value={{
      houses,
      selectedHouseId,
      setSelectedHouseId,
      selectedHouse,
      loading,
      refetchHouses: fetchHouses,
    }}>
      {children}
    </HouseContext.Provider>
  );
};

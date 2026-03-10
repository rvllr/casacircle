import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
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
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchHouses = useCallback(async () => {
    if (isDemo) {
      setHouses(DEMO_HOUSES);
      setLoading(false);
      return;
    }
    if (!user) {
      setHouses([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("houses").select("id, name, family_id");
    const list = data || [];
    setHouses(list);

    if (list.length === 1 && selectedHouseId === "all") {
      setSelectedHouseId(list[0].id);
    }
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

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

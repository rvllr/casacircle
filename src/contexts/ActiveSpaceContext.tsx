import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";

export interface SpaceOption {
  id: string;
  name: string;
  type: string;
}

export interface HouseOption {
  id: string;
  name: string;
  location: string | null;
  family_id: string | null;
}

type ActiveContextType = "space" | "house" | null;

interface ActiveSpaceContextType {
  // Current selection
  activeType: ActiveContextType;
  activeSpaceId: string | null;
  activeHouseId: string | null;
  
  // Available options
  spaces: SpaceOption[];
  directHouses: HouseOption[];
  allHouses: HouseOption[];
  
  // Actions
  selectSpace: (spaceId: string) => void;
  selectHouse: (houseId: string) => void;
  clearSelection: () => void;
  
  // Helpers
  activeLabel: string;
  activeIcon: string;
  loading: boolean;
  
  // Filter helpers
  getFilteredHouseIds: () => string[] | null; // null = no filter (show all)
}

const ActiveSpaceContext = createContext<ActiveSpaceContextType>({
  activeType: null,
  activeSpaceId: null,
  activeHouseId: null,
  spaces: [],
  directHouses: [],
  allHouses: [],
  selectSpace: () => {},
  selectHouse: () => {},
  clearSelection: () => {},
  activeLabel: "Tous les espaces",
  activeIcon: "🏠",
  loading: true,
  getFilteredHouseIds: () => null,
});

export const useActiveSpace = () => useContext(ActiveSpaceContext);

const STORAGE_KEY = "casacircle_active_context";

const SPACE_ICONS: Record<string, string> = {
  sci: "🏢",
  family: "👨‍👩‍👧",
  indivision: "⚖️",
  personal: "🏠",
  multi_family: "🏘️",
};

export const ActiveSpaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [allHouses, setAllHouses] = useState<HouseOption[]>([]);
  const [activeType, setActiveType] = useState<ActiveContextType>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeHouseId, setActiveHouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved context from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveType(parsed.activeType || null);
        setActiveSpaceId(parsed.activeSpaceId || null);
        setActiveHouseId(parsed.activeHouseId || null);
      }
    } catch {}
  }, []);

  // Persist to localStorage
  const persist = useCallback((type: ActiveContextType, spaceId: string | null, houseId: string | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeType: type,
      activeSpaceId: spaceId,
      activeHouseId: houseId,
    }));
  }, []);

  // Fetch spaces and houses
  const fetchData = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    if (!user) {
      setSpaces([]);
      setAllHouses([]);
      setLoading(false);
      return;
    }

    const [familyMembersRes, housesRes] = await Promise.all([
      supabase.from("family_members").select("family_id").eq("user_id", user.id),
      supabase.from("houses").select("id, name, location, family_id"),
    ]);

    const familyIds = (familyMembersRes.data || []).map(m => m.family_id);
    
    if (familyIds.length > 0) {
      const { data: familiesData } = await supabase
        .from("families")
        .select("id, name, type")
        .in("id", familyIds);
      setSpaces((familiesData || []).map(f => ({ id: f.id, name: f.name, type: f.type || "family" })));
    } else {
      setSpaces([]);
    }

    const houses = (housesRes.data || []) as HouseOption[];
    setAllHouses(houses);

    // Auto-select if only one space
    if (familyIds.length === 1 && !activeType) {
      const spaceId = familyIds[0];
      setActiveType("space");
      setActiveSpaceId(spaceId);
      setActiveHouseId(null);
      persist("space", spaceId, null);
    }

    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Direct houses = houses not in any space the user belongs to
  const directHouses = allHouses.filter(h => !h.family_id || !spaces.some(s => s.id === h.family_id));

  const selectSpace = useCallback((spaceId: string) => {
    setActiveType("space");
    setActiveSpaceId(spaceId);
    setActiveHouseId(null);
    persist("space", spaceId, null);
  }, [persist]);

  const selectHouse = useCallback((houseId: string) => {
    setActiveType("house");
    setActiveSpaceId(null);
    setActiveHouseId(houseId);
    persist("house", null, houseId);
  }, [persist]);

  const clearSelection = useCallback(() => {
    setActiveType(null);
    setActiveSpaceId(null);
    setActiveHouseId(null);
    persist(null, null, null);
  }, [persist]);

  // Get label for current selection
  const activeLabel = (() => {
    if (activeType === "space" && activeSpaceId) {
      const space = spaces.find(s => s.id === activeSpaceId);
      return space?.name || "Espace";
    }
    if (activeType === "house" && activeHouseId) {
      const house = allHouses.find(h => h.id === activeHouseId);
      return house?.name || "Bien";
    }
    return "Tous les espaces";
  })();

  const activeIcon = (() => {
    if (activeType === "space" && activeSpaceId) {
      const space = spaces.find(s => s.id === activeSpaceId);
      return SPACE_ICONS[space?.type || "family"] || "🏠";
    }
    if (activeType === "house") return "🏠";
    return "🌐";
  })();

  // Filter helper: returns house IDs to filter by, or null for no filter
  const getFilteredHouseIds = useCallback((): string[] | null => {
    if (activeType === "space" && activeSpaceId) {
      return allHouses.filter(h => h.family_id === activeSpaceId).map(h => h.id);
    }
    if (activeType === "house" && activeHouseId) {
      return [activeHouseId];
    }
    return null; // No filter
  }, [activeType, activeSpaceId, activeHouseId, allHouses]);

  return (
    <ActiveSpaceContext.Provider value={{
      activeType,
      activeSpaceId,
      activeHouseId,
      spaces,
      directHouses,
      allHouses,
      selectSpace,
      selectHouse,
      clearSelection,
      activeLabel,
      activeIcon,
      loading,
      getFilteredHouseIds,
    }}>
      {children}
    </ActiveSpaceContext.Provider>
  );
};

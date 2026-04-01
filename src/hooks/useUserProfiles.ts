import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface UseUserProfilesReturn {
  data: UserProfile[];
  profileMap: Record<string, UserProfile>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getName: (userId: string) => string;
}

/**
 * Fetches all user profiles accessible to the current user (via RLS).
 * Provides a profileMap for O(1) lookups and a getName helper.
 */
export function useUserProfiles(): UseUserProfilesReturn {
  const { user } = useAuth();
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: profiles, error: err } = await supabase
      .from("users_profiles")
      .select("user_id, first_name, last_name");

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setData(profiles || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const profileMap: Record<string, UserProfile> = {};
  for (const p of data) {
    profileMap[p.user_id] = p;
  }

  const getName = useCallback(
    (userId: string): string => {
      const p = profileMap[userId];
      if (p?.first_name) return `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}`;
      return "Membre";
    },
    [data]
  );

  return { data, profileMap, loading, error, refetch, getName };
}

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DemoContextType {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  enterDemo: () => {},
  exitDemo: () => {},
});

export const useDemo = () => useContext(DemoContext);

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [isDemo, setIsDemo] = useState(() => {
    return sessionStorage.getItem("demo_mode") === "true";
  });

  // Reset demo mode when a user authenticates
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        sessionStorage.removeItem("demo_mode");
        setIsDemo(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const enterDemo = useCallback(() => {
    sessionStorage.setItem("demo_mode", "true");
    setIsDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    sessionStorage.removeItem("demo_mode");
    setIsDemo(false);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
};

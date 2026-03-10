import { useDemo } from "@/contexts/DemoContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, X, ArrowRight } from "lucide-react";

const DemoBanner = () => {
  const { isDemo, exitDemo } = useDemo();
  const navigate = useNavigate();

  if (!isDemo) return null;

  const handleExit = () => {
    exitDemo();
    navigate("/");
  };

  const handleSignup = () => {
    exitDemo();
    navigate("/signup");
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <Eye className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-foreground font-medium">Mode démo</span>
      <span className="text-muted-foreground hidden sm:inline">— Les données affichées sont fictives</span>
      <Button size="sm" variant="default" className="h-7 text-xs rounded-lg ml-2" onClick={handleSignup}>
        Créer mon espace <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={handleExit}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default DemoBanner;

import { useState, useEffect } from "react";
import { MapPin, Copy, Navigation, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LocationMapProps {
  location: string;
}

const LocationMap = ({ location }: LocationMapProps) => {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCoords = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&accept-language=fr`
        );
        const data = await res.json();
        if (data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        }
      } catch {
        // silently fail
      }
    };
    fetchCoords();
  }, [location]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      toast({ title: "Adresse copiée !" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier", variant: "destructive" });
    }
  };

  const openInMaps = () => {
    const url = coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Address with actions */}
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-muted-foreground text-sm flex-1">{location}</p>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copier l'adresse">
            {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openInMaps} title="Ouvrir dans Google Maps">
            <Navigation className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Map embed */}
      {coords && (
        <div className="rounded-xl overflow-hidden border border-border h-48 sm:h-56">
          <iframe
            title="Carte"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01},${coords.lat - 0.007},${coords.lon + 0.01},${coords.lat + 0.007}&layer=mapnik&marker=${coords.lat},${coords.lon}`}
          />
        </div>
      )}
    </div>
  );
};

export default LocationMap;

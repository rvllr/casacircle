import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AddressSearchInput from "@/components/AddressSearchInput";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Upload, X, Loader2, ImageIcon, Globe, Copy, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EditHouseDialogProps {
  house: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    capacity: number | null;
    photo_url: string | null;
    is_public?: boolean;
  };
  onSaved: () => void;
}

const EditHouseDialog = ({ house, onSaved }: EditHouseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(house.name);
  const [location, setLocation] = useState(house.location || "");
  const [description, setDescription] = useState(house.description || "");
  const [capacity, setCapacity] = useState(house.capacity?.toString() || "");
  const [photoUrl, setPhotoUrl] = useState(house.photo_url || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(house.photo_url || null);
  const [isPublic, setIsPublic] = useState(house.is_public || false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(house.name);
      setLocation(house.location || "");
      setDescription(house.description || "");
      setCapacity(house.capacity?.toString() || "");
      setPhotoUrl(house.photo_url || "");
      setPhotoPreview(house.photo_url || null);
      setIsPublic(house.is_public || false);
      setCopied(false);
    }
    setOpen(isOpen);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5 Mo.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${house.id}/cover-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("house-photos")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast({ title: "Erreur d'upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("house-photos").getPublicUrl(filePath);
    setPhotoUrl(urlData.publicUrl);
    setPhotoPreview(urlData.publicUrl);
    setUploading(false);
  };

  const removePhoto = () => {
    setPhotoUrl("");
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("houses")
      .update({
        name: name.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        photo_url: photoUrl.trim() || null,
        is_public: isPublic,
      } as any)
      .eq("id", house.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Maison mise à jour !" });
      setOpen(false);
      onSaved();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Modifier la maison</DialogTitle>
          <DialogDescription>Mettez à jour les informations de votre maison.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          {/* Cover photo */}
          <div className="space-y-2">
            <Label>Photo de couverture</Label>
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={photoPreview}
                  alt="Couverture"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground border border-border transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Cliquez pour ajouter une photo</span>
                  </>
                )}
              </button>
            )}
            {photoPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Changer la photo
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editName">Nom *</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editLocation">Adresse / Localisation</Label>
            <AddressSearchInput
              id="editLocation"
              value={location}
              onChange={setLocation}
              placeholder="Rechercher une adresse..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editDescription">Description</Label>
            <Textarea
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre maison..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editCapacity">Capacité (personnes)</Label>
            <Input
              id="editCapacity"
              type="number"
              min={1}
              max={999}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex : 8"
            />
          </div>

          {/* Public toggle */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Page publique
                </Label>
                <p className="text-xs text-muted-foreground">
                  Partagez une page avec les infos du bien
                </p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            {isPublic && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/p/${house.id}`}
                  className="text-xs h-8 bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/p/${house.id}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHouseDialog;

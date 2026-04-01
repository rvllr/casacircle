import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, ImagePlus, X } from "lucide-react";

interface House { id: string; name: string; }
interface Props { onCreated: () => void; }

const NewMemoryDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetch = async () => {
      const { data } = await supabase.from("houses").select("id, name");
      setHouses(data || []);
    };
    fetch();
  }, [open, user]);

  useEffect(() => {
    // Generate previews
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > 5 * 1024 * 1024) return false;
      return true;
    });
    if (valid.length < files.length) {
      toast({ title: "Certains fichiers ignorés", description: "Images uniquement, 5 Mo max.", variant: "destructive" });
    }
    setPhotos((prev) => [...prev, ...valid].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !selectedHouse || !title.trim()) {
      toast({ title: "Veuillez remplir le titre et la maison.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: memory, error } = await supabase.from("house_memories").insert({
      house_id: selectedHouse,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      visit_start: visitStart || null,
      visit_end: visitEnd || null,
    }).select("id").single();

    if (error || !memory) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Upload photos
    for (const photo of photos) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${memory.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("memories")
        .upload(path, photo);

      if (uploadError) {
        toast({ title: "Erreur d'upload", description: `Impossible d'envoyer la photo ${photo.name}.`, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("memories").getPublicUrl(path);

      await supabase.from("memory_photos").insert({
        memory_id: memory.id,
        image_url: urlData.publicUrl,
      });
    }

    toast({ title: "Souvenir ajouté !" });
    onCreated();
    setOpen(false);
    setTitle("");
    setDescription("");
    setVisitStart("");
    setVisitEnd("");
    setSelectedHouse("");
    setPhotos([]);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouveau souvenir</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un souvenir</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Maison</Label>
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger><SelectValue placeholder="Choisir une maison" /></SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Noël 2024, Été en famille..." maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label>Description / Anecdote</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Racontez ce moment..." rows={3} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Début du séjour</Label>
              <Input type="date" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fin du séjour</Label>
              <Input type="date" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} />
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos (max 10)</Label>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Ajouter des photos
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesChange}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Ajout..." : "Ajouter le souvenir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMemoryDialog;

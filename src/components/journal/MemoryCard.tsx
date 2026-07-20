import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, User, ImageIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDateLong, formatDate } from "@/lib/dateFormatter";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorMessages";

interface MemoryPhoto {
  id: string;
  memory_id: string;
  image_url: string;
}

interface Memory {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  description: string | null;
  visit_start: string | null;
  visit_end: string | null;
  created_at: string;
  houses: { name: string } | null;
}

interface MemoryCardProps {
  memory: Memory;
  photos: MemoryPhoto[];
  authorName: string;
  onLightbox: (url: string) => void;
  onRefresh: () => void;
}

const MemoryCard = ({ memory, photos, authorName, onLightbox, onRefresh }: MemoryCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(memory.title);
  const [description, setDescription] = useState(memory.description || "");
  const [visitStart, setVisitStart] = useState(memory.visit_start || "");
  const [visitEnd, setVisitEnd] = useState(memory.visit_end || "");

  const isOwner = user?.id === memory.created_by;
  const m = memory;

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast({ title: "Le titre est obligatoire.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("house_memories")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        visit_start: visitStart || null,
        visit_end: visitEnd || null,
      })
      .eq("id", m.id);

    if (error) {
      toast({ title: "Erreur de mise à jour", description: friendlyError(error), variant: "destructive" });
    } else {
      toast({ title: "Souvenir mis à jour !" });
      setEditOpen(false);
      onRefresh();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("house_memories").delete().eq("id", m.id);
    if (error) {
      toast({ title: "Erreur de suppression", description: friendlyError(error), variant: "destructive" });
    } else {
      toast({ title: "Souvenir supprimé." });
      onRefresh();
    }
    setDeleteOpen(false);
  };

  return (
    <>
      <div className="relative">
        <div className="absolute -left-[17px] top-5 w-3 h-3 rounded-full bg-accent border-2 border-background" />

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="py-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-start gap-2">
                  <h4 className="font-display text-lg text-foreground flex-1">{m.title}</h4>
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-0.5">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditOpen(true)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {m.houses?.name && (
                    <Badge variant="outline" className="text-xs">{m.houses.name}</Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {authorName}
                  </span>
                  {photos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {photos.length}
                    </span>
                  )}
                </div>
              </div>
              {(m.visit_start || m.visit_end) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {m.visit_start && m.visit_end
                    ? `${formatDate(m.visit_start)} → ${formatDate(m.visit_end)}`
                    : m.visit_start
                    ? formatDateLong(m.visit_start)
                    : formatDateLong(m.visit_end!)}
                </div>
              )}
            </div>

            {m.description && (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                {m.description}
              </p>
            )}

            {photos.length > 0 && (
              <div className={`grid gap-2 ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => onLightbox(photo.image_url)}
                    className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={photo.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Modifier le souvenir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Description / Anecdote</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
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
            <Button onClick={handleUpdate} disabled={saving} className="w-full">
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce souvenir ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le souvenir « {m.title} » et ses photos seront définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemoryCard;

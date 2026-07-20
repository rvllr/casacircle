import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createDocumentSignedUrl, resolveStoragePath } from "@/lib/documentStorage";
import { friendlyError } from "@/lib/errorMessages";

const DOC_TYPES: Record<string, string> = {
  statuts_sci: "Statuts SCI",
  pacte_familial: "Pacte familial",
  juridique: "Juridique",
  assemblee_generale: "AG",
  fiscal: "Fiscal",
  other: "Autre",
};

interface SpaceDocument {
  id: string;
  title: string;
  /** Chemin dans le bucket privé `documents`. Source de vérité depuis 20260720150000. */
  file_path?: string | null;
  /** LEGACY — ancienne URL publique, inopérante (bucket privé). Sert de repli pour les lignes historiques. */
  file_url?: string | null;
  type: string;
  uploaded_by: string;
  created_at: string;
  uploaderName?: string;
}

interface SpaceDocumentsProps {
  spaceId: string;
  isAdmin: boolean;
}

const SpaceDocuments = ({ spaceId, isAdmin }: SpaceDocumentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<SpaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("other");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("space_documents")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer les documents.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((d) => d.uploaded_by))];
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      const profMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, `${p.first_name || ""} ${p.last_name || ""}`.trim()]));

      setDocs(data.map((d) => ({ ...d, uploaderName: profMap[d.uploaded_by] || "Membre" })));
    } else {
      setDocs([]);
    }
    setLoading(false);
  }, [spaceId, toast]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `spaces/${spaceId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (uploadError) {
      const msg = uploadError.message?.toLowerCase() ?? "";
      const isDenied = msg.includes("row-level security") || msg.includes("permission") || msg.includes("unauthorized") || msg.includes("policy");
      toast({
        title: isDenied ? "Ajout refusé" : "Erreur upload",
        description: isDenied
          ? "Seuls les administrateurs de l'espace peuvent ajouter un document."
          : friendlyError(uploadError),
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Le bucket est privé : on persiste le CHEMIN, pas une URL. L'URL signée
    // est générée à l'ouverture (cf. handleOpen) car elle expire.
    const { error } = await supabase.from("space_documents").insert({
      space_id: spaceId,
      title: title.trim(),
      file_path: path,
      type: type as any,
      uploaded_by: user.id,
    } as any);

    if (error) {
      // L'insert a échoué : on retire le fichier déjà uploadé pour ne pas
      // laisser d'orphelin dans le bucket.
      await supabase.storage.from("documents").remove([path]);
      const msg = error.message?.toLowerCase() ?? "";
      const isDenied = msg.includes("row-level security") || msg.includes("permission denied");
      toast({
        title: isDenied ? "Ajout refusé" : "Erreur",
        description: isDenied
          ? "Seuls les administrateurs de l'espace peuvent ajouter un document."
          : friendlyError(error),
        variant: "destructive",
      });
    } else {
      toast({ title: "Document ajouté" });
      setTitle("");
      setType("other");
      setFile(null);
      setOpen(false);
      fetchDocs();
    }
    setUploading(false);
  };


  const handleOpen = async (doc: SpaceDocument) => {
    const path = resolveStoragePath(doc);
    if (!path) {
      toast({
        title: "Fichier indisponible",
        description: "Ce document n'a pas de fichier associé exploitable.",
        variant: "destructive",
      });
      return;
    }

    // La fenêtre doit être ouverte de façon synchrone (dans le geste de clic),
    // sinon les bloqueurs de pop-up la rejettent après l'await.
    const popup = window.open("", "_blank", "noopener,noreferrer");

    const { url, error } = await createDocumentSignedUrl(path);

    if (error || !url) {
      popup?.close();
      toast({ title: "Erreur d'ouverture", description: error ?? "URL indisponible.", variant: "destructive" });
      return;
    }

    if (popup) {
      popup.location.href = url;
    } else {
      // Pop-up bloquée : repli sur la navigation courante.
      window.location.href = url;
    }
  };

  const handleDelete = async (doc: SpaceDocument) => {
    // On supprime le fichier AVANT la ligne : si le storage échoue, on
    // interrompt et la ligne reste, donc le document reste visible et
    // supprimable. L'ordre inverse laisserait un fichier orphelin introuvable
    // à vie dans le bucket.
    const path = resolveStoragePath(doc);

    if (path) {
      const { error: storageError } = await supabase.storage.from("documents").remove([path]);
      if (storageError) {
        const msg = storageError.message?.toLowerCase() ?? "";
        const isDenied = msg.includes("row-level security") || msg.includes("permission") || msg.includes("unauthorized") || msg.includes("policy");
        toast({
          title: isDenied ? "Suppression refusée" : "Erreur de suppression",
          description: isDenied
            ? "Seuls les administrateurs de l'espace peuvent supprimer un document."
            : `Le fichier n'a pas pu être supprimé : ${storageError.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.from("space_documents").delete().eq("id", doc.id);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      const isDenied = msg.includes("row-level security") || msg.includes("permission denied");
      toast({
        title: isDenied ? "Suppression refusée" : "Erreur",
        description: isDenied
          ? "Seuls les administrateurs de l'espace peuvent supprimer un document."
          : `Le fichier a été supprimé mais l'entrée subsiste : ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Document supprimé" });
      fetchDocs();
    }
  };


  if (loading) return <div className="text-sm text-muted-foreground animate-pulse">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">Documents de l'espace</h3>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Ajouter un document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Statuts SCI 2026" required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fichier</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Upload...</> : "Ajouter le document"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun document dans cet espace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="border-border/50 shadow-soft">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{DOC_TYPES[doc.type] || doc.type}</Badge>
                    <span>par {doc.uploaderName}</span>
                    <span>· {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(doc)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaceDocuments;

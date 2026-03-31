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
  file_url: string;
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
    const { data } = await supabase
      .from("space_documents")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

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
  }, [spaceId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title.trim()) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `spaces/${spaceId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (uploadError) {
      toast({ title: "Erreur upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    const { error } = await supabase.from("space_documents").insert({
      space_id: spaceId,
      title: title.trim(),
      file_url: urlData.publicUrl,
      type: type as any,
      uploaded_by: user.id,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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

  const handleDelete = async (docId: string) => {
    const { error } = await supabase.from("space_documents").delete().eq("id", docId);
    if (!error) {
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc.id)}>
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

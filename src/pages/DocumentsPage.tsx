import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Download, Trash2, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const docTypeLabels: Record<string, string> = {
  legal: "Juridique",
  insurance: "Assurance",
  invoice: "Facture",
  other: "Autre",
};

interface Doc {
  id: string;
  title: string;
  file_url: string;
  type: string;
  house_id: string;
  uploaded_by: string;
  created_at: string;
  house_name?: string;
  uploader_name?: string;
}

const DocumentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [selectedHouse, setSelectedHouse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const houseIds = [...new Set(data.map((d) => d.house_id))];
      const uploaderIds = [...new Set(data.map((d) => d.uploaded_by))];

      const [{ data: housesData }, { data: profiles }] = await Promise.all([
        supabase.from("houses").select("id, name").in("id", houseIds),
        supabase.from("users_profiles").select("user_id, first_name, last_name").in("user_id", uploaderIds),
      ]);

      const houseMap = Object.fromEntries((housesData || []).map((h) => [h.id, h.name]));
      const profMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Membre"])
      );

      setDocuments(data.map((d) => ({
        ...d,
        house_name: houseMap[d.house_id] || "Maison",
        uploader_name: profMap[d.uploaded_by] || "Membre",
      })));
    } else {
      setDocuments([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filtered = selectedHouseId === "all"
    ? documents
    : documents.filter((d) => d.house_id === selectedHouseId);

  const handleUpload = async () => {
    if (!file || !title.trim() || !selectedHouse || !user) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${selectedHouse}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(path, file);

    if (uploadErr) {
      toast({ title: "Erreur d'upload", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    const { error } = await supabase.from("documents").insert({
      title: title.trim(),
      type: docType as any,
      file_url: urlData.publicUrl,
      house_id: selectedHouse,
      uploaded_by: user.id,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document ajouté !" });
      setTitle("");
      setDocType("other");
      setFile(null);
      setDialogOpen(false);
      fetchDocs();
    }
    setUploading(false);
  };

  const handleDelete = async (doc: Doc) => {
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document supprimé" });
      fetchDocs();
    }
  };

  if (loading || housesLoading) {
    return (
      <AppLayout title="Documents">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Documents">
      <div className="space-y-6 max-w-5xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Documents</h2>
            <p className="page-header-subtitle">Assurance, factures, diagnostics et autres documents importants.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Assurance habitation 2026" maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="legal">Juridique</SelectItem>
                      <SelectItem value="insurance">Assurance</SelectItem>
                      <SelectItem value="invoice">Facture</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label>Fichier</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {file ? file.name : "Cliquez pour choisir un fichier"}
                    </p>
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={!title.trim() || !selectedHouse || !file || uploading} className="w-full">
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <HouseSelector />

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucun document</h3>
              <p className="text-muted-foreground">Ajoutez vos documents importants ici.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-xs">{docTypeLabels[doc.type] || doc.type}</Badge>
                        <span>{doc.house_name}</span>
                        <span>par {doc.uploader_name}</span>
                        <span>{format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Ouvrir
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DocumentsPage;

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TreePine, Plus, Loader2, Trash2, User, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorMessages";

interface FamilyTreeProps {
  familyId: string;
  isAdmin: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  parent_node_id: string | null;
  user_id: string | null;
  birth_year: number | null;
  death_year: number | null;
  photo_url: string | null;
  children: TreeNode[];
}

const FamilyTree = ({ familyId, isAdmin }: FamilyTreeProps) => {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [flatNodes, setFlatNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [parentId, setParentId] = useState<string>("none");

  const fetchNodes = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("family_tree_nodes")
      .select("*")
      .eq("family_id", familyId)
      .order("birth_year", { ascending: true, nullsFirst: true });

    if (fetchError) {
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer l'arbre généalogique.", variant: "destructive" });
    }
    
    const flat = (data || []) as any[];
    setFlatNodes(flat);

    // Build tree
    const nodeMap = new Map<string, TreeNode>();
    flat.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));
    
    const roots: TreeNode[] = [];
    flat.forEach((n) => {
      const node = nodeMap.get(n.id)!;
      if (n.parent_node_id && nodeMap.has(n.parent_node_id)) {
        nodeMap.get(n.parent_node_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    setNodes(roots);
    setLoading(false);
  }, [familyId]);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("family_tree_nodes").insert({
      family_id: familyId,
      name: name.trim(),
      birth_year: birthYear ? parseInt(birthYear) : null,
      death_year: deathYear ? parseInt(deathYear) : null,
      parent_node_id: parentId === "none" ? null : parentId,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
    } else {
      toast({ title: "Membre ajouté !" });
      setName(""); setBirthYear(""); setDeathYear(""); setParentId("none");
      setDialogOpen(false);
      fetchNodes();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("family_tree_nodes").delete().eq("id", id);
    fetchNodes();
  };

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isDeceased = node.death_year != null;
    const years = [node.birth_year, node.death_year].filter(Boolean).join(" — ");

    return (
      <div key={node.id} className="space-y-1" style={{ marginLeft: depth > 0 ? "1.5rem" : 0 }}>
        <div className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${isDeceased ? "bg-muted/30 border-border/30" : "bg-card border-border/50 shadow-soft"}`}>
          {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          
          {node.photo_url ? (
            <img src={node.photo_url} alt={node.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDeceased ? "bg-muted" : "bg-primary/10"}`}>
              <User className={`h-4 w-4 ${isDeceased ? "text-muted-foreground" : "text-primary"}`} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDeceased ? "text-muted-foreground" : "text-foreground"}`}>
              {node.name}
            </p>
            {years && (
              <p className="text-[10px] text-muted-foreground">{years}</p>
            )}
          </div>

          {node.user_id && (
            <Badge variant="secondary" className="text-[9px] shrink-0">Compte lié</Badge>
          )}

          {isAdmin && (
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => handleDelete(node.id)}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>

        {node.children.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-1">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg text-foreground">Arbre familial</h3>
          {flatNodes.length > 0 && <Badge variant="secondary" className="text-xs">{flatNodes.length} membre{flatNodes.length > 1 ? "s" : ""}</Badge>}
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un membre à l'arbre</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Jean Dupont" maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Année de naissance</Label>
                    <Input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1950" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Année de décès (optionnel)</Label>
                    <Input type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} placeholder="—" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Parent dans l'arbre</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun (racine)</SelectItem>
                      {flatNodes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={!name.trim() || submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {nodes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TreePine className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg text-foreground mb-1">Arbre familial vide</h3>
            <p className="text-sm text-muted-foreground">Construisez votre arbre en ajoutant les membres de la famille.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {nodes.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
};

export default FamilyTree;

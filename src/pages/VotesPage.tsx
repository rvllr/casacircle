import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Vote, Plus, ThumbsUp, ThumbsDown, Minus, Loader2, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VoteRow {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  house_id: string;
  created_by: string;
  created_at: string;
  house_name?: string;
  creator_name?: string;
}

interface VoteResponse {
  id: string;
  vote_id: string;
  user_id: string;
  response: "yes" | "no" | "abstain";
}

const VotesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHouse, setSelectedHouse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: votesData } = await supabase
      .from("votes")
      .select("*")
      .order("created_at", { ascending: false });

    const votesList = votesData || [];

    if (votesList.length > 0) {
      const houseIds = [...new Set(votesList.map((v) => v.house_id))];
      const creatorIds = [...new Set(votesList.map((v) => v.created_by))];
      const voteIds = votesList.map((v) => v.id);

      const [{ data: housesData }, { data: profiles }, { data: responsesData }] = await Promise.all([
        supabase.from("houses").select("id, name").in("id", houseIds),
        supabase.from("users_profiles").select("user_id, first_name, last_name").in("user_id", creatorIds),
        supabase.from("vote_responses").select("*").in("vote_id", voteIds),
      ]);

      const houseMap = Object.fromEntries((housesData || []).map((h) => [h.id, h.name]));
      const profMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(" ") || "Membre"])
      );

      setVotes(votesList.map((v) => ({
        ...v,
        house_name: houseMap[v.house_id] || "Maison",
        creator_name: profMap[v.created_by] || "Membre",
      })));
      setResponses((responsesData || []) as VoteResponse[]);
    } else {
      setVotes([]);
      setResponses([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = selectedHouseId === "all"
    ? votes
    : votes.filter((v) => v.house_id === selectedHouseId);

  const handleCreate = async () => {
    if (!title.trim() || !selectedHouse || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("votes").insert({
      title: title.trim(),
      description: description.trim() || null,
      house_id: selectedHouse,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vote créé !" });
      setTitle("");
      setDescription("");
      setDialogOpen(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleVote = async (voteId: string, response: "yes" | "no" | "abstain") => {
    if (!user) return;
    const existing = responses.find((r) => r.vote_id === voteId && r.user_id === user.id);
    if (existing) {
      if (existing.response === response) return;
      await supabase.from("vote_responses").update({ response }).eq("id", existing.id);
    } else {
      await supabase.from("vote_responses").insert({
        vote_id: voteId,
        user_id: user.id,
        response,
      });
    }
    fetchData();
  };

  if (loading || housesLoading) {
    return (
      <AppLayout title="Votes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Votes">
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Votes</h2>
            <p className="page-header-subtitle">Décidez ensemble des projets de la maison.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau vote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un vote</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Refaire la terrasse ?" maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires..." maxLength={2000} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Maison</Label>
                  <Select value={selectedHouse} onValueChange={setSelectedHouse}>
                    <SelectTrigger><SelectValue placeholder="Choisir une maison" /></SelectTrigger>
                    <SelectContent>
                      {houses.map((h) => (<SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={!title.trim() || !selectedHouse || submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer le vote
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <HouseSelector />

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucun vote</h3>
              <p className="text-muted-foreground">Créez un vote pour décider ensemble.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((vote) => {
              const voteResponses = responses.filter((r) => r.vote_id === vote.id);
              const total = voteResponses.length;
              const yes = voteResponses.filter((r) => r.response === "yes").length;
              const no = voteResponses.filter((r) => r.response === "no").length;
              const abstain = voteResponses.filter((r) => r.response === "abstain").length;
              const myResponse = voteResponses.find((r) => r.user_id === user?.id);
              const isExpired = vote.deadline && new Date(vote.deadline) < new Date();

              return (
                <Card key={vote.id}>
                  <CardContent className="py-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-display text-lg text-foreground">{vote.title}</h3>
                        {vote.description && <p className="text-sm text-muted-foreground">{vote.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{vote.house_name}</Badge>
                          <span>par {vote.creator_name}</span>
                          <span>{format(new Date(vote.created_at), "d MMM yyyy", { locale: fr })}</span>
                        </div>
                      </div>
                      {isExpired && <Badge variant="secondary">Terminé</Badge>}
                    </div>

                    {/* Results */}
                    {total > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-accent font-medium">✓ Oui: {yes}</span>
                          <span className="text-destructive font-medium">✗ Non: {no}</span>
                          <span className="text-muted-foreground">— Abstention: {abstain}</span>
                        </div>
                        <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
                          {yes > 0 && <div className="bg-accent" style={{ width: `${(yes / total) * 100}%` }} />}
                          {no > 0 && <div className="bg-destructive" style={{ width: `${(no / total) * 100}%` }} />}
                          {abstain > 0 && <div className="bg-muted-foreground/30" style={{ width: `${(abstain / total) * 100}%` }} />}
                        </div>
                        <p className="text-xs text-muted-foreground">{total} vote{total > 1 ? "s" : ""}</p>
                      </div>
                    )}

                    {/* Vote buttons */}
                    {!isExpired && (
                      <div className="flex items-center gap-2">
                        {([
                          { value: "yes" as const, icon: ThumbsUp, label: "Oui", activeClass: "bg-accent text-accent-foreground" },
                          { value: "no" as const, icon: ThumbsDown, label: "Non", activeClass: "bg-destructive text-destructive-foreground" },
                          { value: "abstain" as const, icon: Minus, label: "Abstention", activeClass: "bg-muted-foreground text-white" },
                        ]).map(({ value, icon: Icon, label, activeClass }) => (
                          <Button
                            key={value}
                            size="sm"
                            variant={myResponse?.response === value ? "default" : "outline"}
                            className={myResponse?.response === value ? activeClass : ""}
                            onClick={() => handleVote(vote.id, value)}
                          >
                            <Icon className="h-3.5 w-3.5 mr-1" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default VotesPage;

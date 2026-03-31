import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_VOTES, DEMO_VOTE_RESPONSES } from "@/lib/demoData";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import WeightedVoteResults from "@/components/WeightedVoteResults";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Vote, Plus, ThumbsUp, ThumbsDown, Minus, Loader2, BookMarked, Scale } from "lucide-react";
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
  voting_mode?: string;
  majority_rule?: string;
}

interface VoteResponse {
  id: string;
  vote_id: string;
  user_id: string;
  response: "yes" | "no" | "abstain";
}

const VotesPage = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { toast } = useToast();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedHouse, setSelectedHouse] = useState("");
  const [votingMode, setVotingMode] = useState("simple");
  const [majorityRule, setMajorityRule] = useState("simple");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setVotes(DEMO_VOTES.map(v => ({ ...v, voting_mode: "simple", majority_rule: "simple" })));
      setResponses(DEMO_VOTE_RESPONSES as any);
      setLoading(false);
      return;
    }
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
        voting_mode: (v as any).voting_mode || "simple",
        majority_rule: (v as any).majority_rule || "simple",
      })));
      setResponses((responsesData || []) as VoteResponse[]);
    } else {
      setVotes([]);
      setResponses([]);
    }
    setLoading(false);
  }, [user, isDemo]);

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
      voting_mode: votingMode,
      majority_rule: majorityRule,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vote créé !" });
      setTitle("");
      setDescription("");
      setVotingMode("simple");
      setMajorityRule("simple");
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

  const handleValidateVote = async (vote: VoteRow) => {
    if (!user) return;
    const voteResponses = responses.filter((r) => r.vote_id === vote.id);
    const yes = voteResponses.filter((r) => r.response === "yes").length;
    const no = voteResponses.filter((r) => r.response === "no").length;
    const abstain = voteResponses.filter((r) => r.response === "abstain").length;

    // Calculate weighted results if needed
    let yesW = 0, noW = 0;
    if (vote.voting_mode === "weighted") {
      const { data: sharesData } = await supabase
        .from("ownership_shares").select("user_id, percentage").eq("house_id", vote.house_id);
      const shares: Record<string, number> = {};
      (sharesData || []).forEach((s: any) => { shares[s.user_id] = s.percentage; });
      yesW = voteResponses.filter(r => r.response === "yes").reduce((s, r) => s + (shares[r.user_id] || 0), 0);
      noW = voteResponses.filter(r => r.response === "no").reduce((s, r) => s + (shares[r.user_id] || 0), 0);
    }

    const threshold = vote.majority_rule === "two_thirds" ? 66.67 : 50;
    let isApproved: boolean;
    if (vote.voting_mode === "weighted") {
      const base = yesW + noW;
      isApproved = base > 0 ? (yesW / base) * 100 > threshold : false;
    } else {
      isApproved = yes + no > 0 ? (yes / (yes + no)) * 100 > threshold : false;
    }

    const { error } = await supabase.from("decision_register").insert({
      vote_id: vote.id,
      house_id: vote.house_id,
      title: vote.title,
      description: vote.description,
      decision: isApproved ? "approved" : "rejected",
      yes_count: yes,
      no_count: no,
      abstain_count: abstain,
      yes_weighted: yesW,
      no_weighted: noW,
      majority_rule: vote.majority_rule || "simple",
      voting_mode: vote.voting_mode || "simple",
    } as any);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isApproved ? "Vote validé ✓" : "Vote rejeté ✗", description: "La décision a été enregistrée." });
    }
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Scale className="h-3 w-3" /> Mode de vote</Label>
                    <Select value={votingMode} onValueChange={setVotingMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple (1 personne = 1 voix)</SelectItem>
                        <SelectItem value="weighted">Pondéré (par quote-part)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Règle de majorité</Label>
                    <Select value={majorityRule} onValueChange={setMajorityRule}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Majorité simple (&gt;50%)</SelectItem>
                        <SelectItem value="two_thirds">Majorité 2/3 (&gt;66%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              const isWeighted = vote.voting_mode === "weighted";

              return (
                <Card key={vote.id}>
                  <CardContent className="py-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-display text-lg text-foreground">{vote.title}</h3>
                        {vote.description && <p className="text-sm text-muted-foreground">{vote.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{vote.house_name}</Badge>
                          {isWeighted && <Badge variant="secondary" className="text-xs gap-1"><Scale className="h-3 w-3" />Pondéré</Badge>}
                          <span>par {vote.creator_name}</span>
                          <span>{format(new Date(vote.created_at), "d MMM yyyy", { locale: fr })}</span>
                        </div>
                      </div>
                      {isExpired && <Badge variant="secondary">Terminé</Badge>}
                    </div>

                    {/* Simple results */}
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

                    {/* Weighted results */}
                    {isWeighted && total > 0 && (
                      <WeightedVoteResults
                        voteId={vote.id}
                        houseId={vote.house_id}
                        votingMode={vote.voting_mode || "simple"}
                        majorityRule={vote.majority_rule || "simple"}
                        responses={voteResponses}
                      />
                    )}

                    {/* Vote buttons */}
                    {!isExpired && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {([
                          { value: "yes" as const, icon: ThumbsUp, label: "Oui", activeClass: "bg-accent text-accent-foreground" },
                          { value: "no" as const, icon: ThumbsDown, label: "Non", activeClass: "bg-destructive text-destructive-foreground" },
                          { value: "abstain" as const, icon: Minus, label: "Abstention", activeClass: "bg-muted-foreground text-white" },
                        ]).map(({ value, icon: Icon, label, activeClass }) => (
                          <Button
                            key={value}
                            size="sm"
                            variant={myResponse?.response === value ? "default" : "outline"}
                            className={`text-xs sm:text-sm ${myResponse?.response === value ? activeClass : ""}`}
                            onClick={() => handleVote(vote.id, value)}
                          >
                            <Icon className="h-3.5 w-3.5 mr-1" />
                            {label}
                          </Button>
                        ))}
                        
                        {/* Validate vote button (for votes with responses) */}
                        {total > 0 && vote.created_by === user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs sm:text-sm ml-auto"
                            onClick={() => handleValidateVote(vote)}
                          >
                            <BookMarked className="h-3.5 w-3.5 mr-1" />
                            Enregistrer la décision
                          </Button>
                        )}
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

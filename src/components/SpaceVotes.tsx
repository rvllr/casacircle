import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Vote, Plus, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { friendlyError } from "@/lib/errorMessages";

interface SpaceVote {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  created_by: string;
  created_at: string;
  creatorName?: string;
  responses: { user_id: string; response: "yes" | "no" | "abstain" }[];
}

interface SpaceVotesProps {
  spaceId: string;
  isAdmin: boolean;
}

const SpaceVotes = ({ spaceId, isAdmin }: SpaceVotesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [votes, setVotes] = useState<SpaceVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from("votes")
      .select("id, title, description, deadline, created_by, created_at")
      .eq("space_id", spaceId)
      .is("house_id", null)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setVotes([]);
      setLoading(false);
      return;
    }

    // Fetch creator names
    const creatorIds = [...new Set(data.map((v) => v.created_by))];
    const { data: profiles } = await supabase
      .from("users_profiles")
      .select("user_id, first_name, last_name")
      .in("user_id", creatorIds);
    const profMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, `${p.first_name || ""} ${p.last_name || ""}`.trim()]));

    // Fetch responses
    const voteIds = data.map((v) => v.id);
    const { data: responses } = await supabase
      .from("vote_responses")
      .select("vote_id, user_id, response")
      .in("vote_id", voteIds);

    const responseMap: Record<string, { user_id: string; response: "yes" | "no" | "abstain" }[]> = {};
    (responses || []).forEach((r) => {
      if (!responseMap[r.vote_id]) responseMap[r.vote_id] = [];
      responseMap[r.vote_id].push({ user_id: r.user_id, response: r.response });
    });

    setVotes(data.map((v) => ({
      ...v,
      creatorName: profMap[v.created_by] || "Membre",
      responses: responseMap[v.id] || [],
    })));
    setLoading(false);
  }, [spaceId]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setCreating(true);

    const { error } = await supabase.from("votes").insert({
      space_id: spaceId,
      house_id: null as any,
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
    } else {
      toast({ title: "Vote créé" });
      setTitle("");
      setDescription("");
      setDeadline("");
      setOpen(false);
      fetchVotes();
    }
    setCreating(false);
  };

  const handleVote = async (voteId: string, response: "yes" | "no" | "abstain") => {
    if (!user) return;
    const existing = votes.find((v) => v.id === voteId)?.responses.find((r) => r.user_id === user.id);
    if (existing) {
      await supabase.from("vote_responses").update({ response }).eq("vote_id", voteId).eq("user_id", user.id);
    } else {
      await supabase.from("vote_responses").insert({ vote_id: voteId, user_id: user.id, response });
    }
    fetchVotes();
  };

  if (loading) return <div className="text-sm text-muted-foreground animate-pulse">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">Votes de l'espace</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau vote</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Créer un vote</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Question / Sujet</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Approuver les comptes 2025" required />
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Date limite (optionnel)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Création..." : "Créer le vote"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {votes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Vote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun vote au niveau de cet espace.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {votes.map((vote) => {
            const yesCount = vote.responses.filter((r) => r.response === "yes").length;
            const noCount = vote.responses.filter((r) => r.response === "no").length;
            const abstainCount = vote.responses.filter((r) => r.response === "abstain").length;
            const myResponse = user ? vote.responses.find((r) => r.user_id === user.id)?.response : null;
            const isExpired = vote.deadline ? isPast(new Date(vote.deadline)) : false;

            return (
              <Card key={vote.id} className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{vote.title}</p>
                      {vote.description && <p className="text-xs text-muted-foreground mt-0.5">{vote.description}</p>}
                    </div>
                    {vote.deadline && (
                      <Badge variant={isExpired ? "destructive" : "outline"} className="text-xs shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(vote.deadline), "dd MMM yyyy", { locale: fr })}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>par {vote.creatorName}</span>
                    <span>· {format(new Date(vote.created_at), "dd MMM yyyy", { locale: fr })}</span>
                  </div>

                  {/* Results */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> {yesCount}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" /> {noCount}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MinusCircle className="h-4 w-4" /> {abstainCount}
                    </span>
                  </div>

                  {/* Vote buttons */}
                  {!isExpired && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={myResponse === "yes" ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={() => handleVote(vote.id, "yes")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pour
                      </Button>
                      <Button
                        size="sm"
                        variant={myResponse === "no" ? "destructive" : "outline"}
                        className="h-8 text-xs"
                        onClick={() => handleVote(vote.id, "no")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Contre
                      </Button>
                      <Button
                        size="sm"
                        variant={myResponse === "abstain" ? "secondary" : "outline"}
                        className="h-8 text-xs"
                        onClick={() => handleVote(vote.id, "abstain")}
                      >
                        <MinusCircle className="h-3.5 w-3.5 mr-1" /> Abstention
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpaceVotes;

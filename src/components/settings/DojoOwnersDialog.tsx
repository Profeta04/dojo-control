import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

interface Props {
  dojoId: string | null;
  onClose: () => void;
}

export function DojoOwnersDialog({ dojoId, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch owners with their profiles
  const { data: owners, isLoading } = useQuery({
    queryKey: ["dojo-owners-details", dojoId],
    queryFn: async () => {
      const { data: ownersData, error: ownersError } = await supabase
        .from("dojo_owners")
        .select("*")
        .eq("dojo_id", dojoId!);

      if (ownersError) throw ownersError;

      // Fetch profiles for each owner
      if (ownersData.length === 0) return [];

      const userIds = ownersData.map((o) => o.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      return ownersData.map((owner) => ({
        ...owner,
        profile: profiles?.find((p) => p.user_id === owner.user_id),
      }));
    },
    enabled: !!dojoId,
  });

  const addOwnerMutation = useMutation({
    mutationFn: async (email: string) => {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .single();

      if (profileError || !profile) {
        throw new Error("Usuário não encontrado com este email");
      }

      // Add as owner
      const { error: ownerError } = await supabase.from("dojo_owners").insert({
        dojo_id: dojoId!,
        user_id: profile.user_id,
      });

      if (ownerError) {
        if (ownerError.code === "23505") {
          throw new Error("Este usuário já é dono deste dojo");
        }
        throw ownerError;
      }

      // Assign 'dono' role if not already assigned
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: profile.user_id,
        role: "dono",
      }).select().single();

      // Ignore if role already exists
      if (roleError && roleError.code !== "23505") {
        console.error("Error assigning dono role:", roleError);
      }
    },
    onSuccess: () => {
      toast({ title: "Dono adicionado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-owners-details", dojoId] });
      setEmail("");
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar dono", description: error.message, variant: "destructive" });
    },
  });

  const removeOwnerMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      const { error } = await supabase.from("dojo_owners").delete().eq("id", ownerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dono removido com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-owners-details", dojoId] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao remover dono", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!email.trim()) {
      toast({ title: "Digite o email do usuário", variant: "destructive" });
      return;
    }
    addOwnerMutation.mutate(email);
  };

  return (
    <Dialog open={!!dojoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Gerenciar Donos
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova donos (proprietários) deste dojo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Add Owner Form */}
          {isAdding ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="owner-email" className="sr-only">Email do usuário</Label>
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="Email do usuário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <Button onClick={handleAdd} disabled={addOwnerMutation.isPending}>
                {addOwnerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Adicionar Dono
            </Button>
          )}

          {/* Owners List */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !owners || owners.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum dono cadastrado para este dojo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell>{owner.profile?.name || "N/A"}</TableCell>
                    <TableCell>{owner.profile?.email || "N/A"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOwnerMutation.mutate(owner.id)}
                        disabled={removeOwnerMutation.isPending}
                        aria-label="Remover dono"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

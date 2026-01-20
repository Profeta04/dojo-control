import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

interface Props {
  dojoId: string | null;
  onClose: () => void;
}

export function DojoSenseisDialog({ dojoId, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch senseis with their profiles
  const { data: senseis, isLoading } = useQuery({
    queryKey: ["dojo-senseis-details", dojoId],
    queryFn: async () => {
      const { data: senseisData, error: senseisError } = await supabase
        .from("dojo_senseis")
        .select("*")
        .eq("dojo_id", dojoId!);

      if (senseisError) throw senseisError;

      // Fetch profiles for each sensei
      if (senseisData.length === 0) return [];

      const userIds = senseisData.map((s: any) => s.sensei_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      return senseisData.map((sensei: any) => ({
        ...sensei,
        profile: profiles?.find((p) => p.user_id === sensei.sensei_id),
      }));
    },
    enabled: !!dojoId,
  });

  const addSenseiMutation = useMutation({
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

      // Check if user has sensei role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .eq("role", "sensei")
        .single();

      if (!roleData) {
        throw new Error("Este usuário não possui a role de Sensei");
      }

      // Add as sensei
      const { error: senseiError } = await supabase.from("dojo_senseis").insert({
        dojo_id: dojoId!,
        sensei_id: profile.user_id,
      });

      if (senseiError) {
        if (senseiError.code === "23505") {
          throw new Error("Este Sensei já está vinculado a este dojo");
        }
        throw senseiError;
      }
    },
    onSuccess: () => {
      toast({ title: "Sensei vinculado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-senseis-details", dojoId] });
      setEmail("");
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao vincular Sensei", description: error.message, variant: "destructive" });
    },
  });

  const removeSenseiMutation = useMutation({
    mutationFn: async (senseiId: string) => {
      const { error } = await supabase.from("dojo_senseis").delete().eq("id", senseiId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sensei desvinculado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-senseis-details", dojoId] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao desvincular Sensei", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!email.trim()) {
      toast({ title: "Digite o email do Sensei", variant: "destructive" });
      return;
    }
    addSenseiMutation.mutate(email);
  };

  return (
    <Dialog open={!!dojoId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" aria-hidden="true" />
            Gerenciar Senseis
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Vincule ou desvincule Senseis deste dojo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
          {/* Add Sensei Form */}
          {isAdding ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label htmlFor="sensei-email" className="sr-only">Email do Sensei</Label>
                <Input
                  id="sensei-email"
                  type="email"
                  placeholder="Email do Sensei"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={addSenseiMutation.isPending} size="sm" className="flex-1 sm:flex-none">
                  {addSenseiMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Vincular"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)} size="sm" className="flex-1 sm:flex-none">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full h-9 text-sm">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Vincular Sensei
            </Button>
          )}

          {/* Senseis List */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !senseis || senseis.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nenhum Sensei vinculado a este dojo.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden xs:table-cell">Email</TableHead>
                    <TableHead className="w-10 sm:w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senseis.map((sensei) => (
                    <TableRow key={sensei.id}>
                      <TableCell className="text-xs sm:text-sm py-2">
                        <div>
                          <span className="block truncate max-w-[120px] sm:max-w-none">{sensei.profile?.name || "N/A"}</span>
                          <span className="block xs:hidden text-muted-foreground truncate max-w-[120px]">
                            {sensei.profile?.email || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 hidden xs:table-cell">
                        <span className="truncate max-w-[150px] block">{sensei.profile?.email || "N/A"}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeSenseiMutation.mutate(sensei.id)}
                          disabled={removeSenseiMutation.isPending}
                          aria-label="Desvincular Sensei"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

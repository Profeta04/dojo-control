import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SenseiDojoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senseiUserId: string;
  senseiName: string;
}

interface Dojo {
  id: string;
  name: string;
}

export function SenseiDojoDialog({
  open,
  onOpenChange,
  senseiUserId,
  senseiName,
}: SenseiDojoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDojos, setSelectedDojos] = useState<string[]>([]);

  // Fetch all dojos
  const { data: dojos } = useQuery({
    queryKey: ["all-dojos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojos")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Dojo[];
    },
    enabled: open,
  });

  // Fetch current sensei-dojo links
  const { data: currentLinks } = useQuery({
    queryKey: ["sensei-dojos", senseiUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_senseis")
        .select("dojo_id")
        .eq("sensei_id", senseiUserId);

      if (error) throw error;
      return data.map((d) => d.dojo_id);
    },
    enabled: open && !!senseiUserId,
  });

  // Initialize selected dojos when current links load
  useEffect(() => {
    if (currentLinks) {
      setSelectedDojos(currentLinks);
    }
  }, [currentLinks]);

  const handleToggleDojo = (dojoId: string) => {
    setSelectedDojos((prev) =>
      prev.includes(dojoId)
        ? prev.filter((id) => id !== dojoId)
        : [...prev, dojoId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Get current links to compare
      const { data: existingLinks } = await supabase
        .from("dojo_senseis")
        .select("id, dojo_id")
        .eq("sensei_id", senseiUserId);

      const existingDojoIds = existingLinks?.map((l) => l.dojo_id) || [];

      // Dojos to add
      const dojosToAdd = selectedDojos.filter(
        (id) => !existingDojoIds.includes(id)
      );

      // Dojos to remove
      const dojosToRemove = existingDojoIds.filter(
        (id) => !selectedDojos.includes(id)
      );

      // Add new links
      if (dojosToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("dojo_senseis")
          .insert(
            dojosToAdd.map((dojoId) => ({
              sensei_id: senseiUserId,
              dojo_id: dojoId,
            }))
          );

        if (insertError) throw insertError;
      }

      // Remove old links
      if (dojosToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("dojo_senseis")
          .delete()
          .eq("sensei_id", senseiUserId)
          .in("dojo_id", dojosToRemove);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Vínculos atualizados!",
        description: `Os dojos de ${senseiName} foram atualizados.`,
      });

      queryClient.invalidateQueries({ queryKey: ["sensei-dojos"] });
      queryClient.invalidateQueries({ queryKey: ["dojo-senseis"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar vínculos: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vincular a Dojos
          </DialogTitle>
          <DialogDescription>
            Selecione os dojos aos quais {senseiName} terá acesso.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {dojos && dojos.length > 0 ? (
              dojos.map((dojo) => (
                <div
                  key={dojo.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={dojo.id}
                    checked={selectedDojos.includes(dojo.id)}
                    onCheckedChange={() => handleToggleDojo(dojo.id)}
                  />
                  <Label
                    htmlFor={dojo.id}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {dojo.name}
                  </Label>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum dojo cadastrado.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

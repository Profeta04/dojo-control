import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BELT_LABELS } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type BeltGradeEnum = Database["public"]["Enums"]["belt_grade"];

interface SidebarBeltDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarBeltDialog({ open, onOpenChange }: SidebarBeltDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBelt, setSelectedBelt] = useState(profile?.belt_grade || "");
  const [loading, setLoading] = useState(false);

  const senseiBelts = Object.entries(BELT_LABELS).filter(([key]) =>
    key === "marrom" || key.startsWith("preta")
  );

  const handleUpdate = async () => {
    if (!profile || !selectedBelt) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ belt_grade: selectedBelt as BeltGradeEnum })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      queryClient.setQueryData(["auth-profile", profile.user_id], (old: any) =>
        old ? { ...old, belt_grade: selectedBelt } : old
      );
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      queryClient.invalidateQueries({ queryKey: ["senseis"] });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Failed to update belt:", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Graduação</DialogTitle>
          <DialogDescription>Selecione sua nova graduação.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Graduação</Label>
            <Select value={selectedBelt} onValueChange={setSelectedBelt}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a faixa" />
              </SelectTrigger>
              <SelectContent>
                {senseiBelts.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={loading || !selectedBelt}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

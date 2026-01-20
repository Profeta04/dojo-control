import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Pencil, Trash2, UserMinus, Loader2, Building2 } from "lucide-react";
import { BELT_LABELS } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";
import { SenseiDojoDialog } from "./SenseiDojoDialog";

type BeltGradeEnum = Database["public"]["Enums"]["belt_grade"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SenseiActionsProps {
  sensei: Profile;
}

export function SenseiActions({ sensei }: SenseiActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeRoleDialogOpen, setRemoveRoleDialogOpen] = useState(false);
  const [dojoDialogOpen, setDojoDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState(sensei.name);
  const [editPhone, setEditPhone] = useState(sensei.phone || "");
  const [editBeltGrade, setEditBeltGrade] = useState(sensei.belt_grade || "");

  // Filter to only show black belts as options for senseis
  const blackBelts = Object.entries(BELT_LABELS).filter(([key]) =>
    key.startsWith("preta")
  );

  const handleEditSensei = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData: Partial<Profile> = {
        name: editName,
        phone: editPhone || null,
        belt_grade: editBeltGrade as BeltGradeEnum || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", sensei.user_id);

      if (error) throw error;

      toast({
        title: "Sensei atualizado!",
        description: `Os dados de ${editName} foram atualizados.`,
      });

      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["senseis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar sensei: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSenseiRole = async () => {
    setIsLoading(true);

    try {
      // Remove sensei role, keeping user as a regular user
      const { error } = await supabase.rpc("remove_user_role", {
        _user_id: sensei.user_id,
        _role: "sensei",
      });

      if (error) throw error;

      // Assign student role instead
      await supabase.rpc("assign_user_role", {
        _user_id: sensei.user_id,
        _role: "student",
      });

      toast({
        title: "Cargo removido",
        description: `${sensei.name} não é mais um Sensei. Foi convertido para aluno.`,
      });

      setRemoveRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["senseis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao remover cargo: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSensei = async () => {
    setIsLoading(true);

    try {
      // First remove the sensei role
      await supabase.rpc("remove_user_role", {
        _user_id: sensei.user_id,
        _role: "sensei",
      });

      // Update profile to rejected status (soft delete)
      const { error } = await supabase
        .from("profiles")
        .update({ 
          registration_status: "rejeitado" 
        })
        .eq("user_id", sensei.user_id);

      if (error) throw error;

      toast({
        title: "Sensei removido",
        description: `${sensei.name} foi removido do sistema.`,
      });

      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["senseis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao remover sensei: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar dados
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDojoDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Vincular a Dojos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRemoveRoleDialogOpen(true)}>
            <UserMinus className="h-4 w-4 mr-2" />
            Remover cargo de Sensei
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir do sistema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Sensei</DialogTitle>
            <DialogDescription>
              Atualize os dados do sensei {sensei.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSensei} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nome completo</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={sensei.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefone</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBelt">Graduação</Label>
              <Select value={editBeltGrade} onValueChange={setEditBeltGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa" />
                </SelectTrigger>
                <SelectContent>
                  {blackBelts.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={removeRoleDialogOpen} onOpenChange={setRemoveRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cargo de Sensei?</AlertDialogTitle>
            <AlertDialogDescription>
              {sensei.name} perderá o acesso às funcionalidades de Sensei e será 
              convertido para aluno. Esta ação pode ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSenseiRole}
              disabled={isLoading}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover cargo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sensei do sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              {sensei.name} será removido do sistema. O registro será marcado como 
              rejeitado e o acesso será bloqueado. Esta ação não pode ser desfeita facilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSensei}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dojo Link Dialog */}
      <SenseiDojoDialog
        open={dojoDialogOpen}
        onOpenChange={setDojoDialogOpen}
        senseiUserId={sensei.user_id}
        senseiName={sensei.name}
      />
    </>
  );
}

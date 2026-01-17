import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojos, Dojo } from "@/hooks/useMultiDojo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Loader2, Users } from "lucide-react";
import { DojoOwnersDialog } from "./DojoOwnersDialog";
import { DojoSenseisDialog } from "./DojoSenseisDialog";

export function DojoManagement() {
  const { data: dojos, isLoading } = useDojos();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [ownersDojoId, setOwnersDojoId] = useState<string | null>(null);
  const [senseisDojoId, setSenseisDojoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const createDojoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("dojos").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dojo criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
      setIsCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar dojo", description: error.message, variant: "destructive" });
    },
  });

  const updateDojoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("dojos").update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dojo atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
      setEditingDojo(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar dojo", description: error.message, variant: "destructive" });
    },
  });

  const deleteDojoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dojos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dojo excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir dojo", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    createDojoMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingDojo || !formData.name.trim()) return;
    updateDojoMutation.mutate({ id: editingDojo.id, data: formData });
  };

  const openEdit = (dojo: Dojo) => {
    setFormData({
      name: dojo.name,
      email: dojo.email || "",
      phone: dojo.phone || "",
      address: dojo.address || "",
    });
    setEditingDojo(dojo);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" aria-hidden="true" />
              Gerenciamento de Dojos
            </CardTitle>
            <CardDescription>
              Gerencie os dojos cadastrados no sistema
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Novo Dojo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Dojo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo dojo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nome *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do dojo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@dojo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Telefone</Label>
                  <Input
                    id="create-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-address">Endereço</Label>
                  <Input
                    id="create-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createDojoMutation.isPending}
                  className="w-full"
                >
                  {createDojoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Dojo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!dojos || dojos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dojo cadastrado. Clique em "Novo Dojo" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dojos.map((dojo) => (
                  <TableRow key={dojo.id}>
                    <TableCell className="font-medium">{dojo.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{dojo.email || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{dojo.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={dojo.is_active ? "default" : "secondary"}>
                        {dojo.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setOwnersDojoId(dojo.id)}
                          title="Gerenciar donos"
                          aria-label="Gerenciar donos"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSenseisDojoId(dojo.id)}
                          title="Gerenciar senseis"
                          aria-label="Gerenciar senseis"
                        >
                          <Users className="h-4 w-4 text-accent" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(dojo)}
                          aria-label="Editar dojo"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDojoMutation.mutate(dojo.id)}
                          disabled={deleteDojoMutation.isPending}
                          aria-label="Excluir dojo"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDojo} onOpenChange={(open) => !open && setEditingDojo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dojo</DialogTitle>
            <DialogDescription>
              Atualize as informações do dojo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <Button
              onClick={handleUpdate}
              disabled={updateDojoMutation.isPending}
              className="w-full"
            >
              {updateDojoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owners Dialog */}
      <DojoOwnersDialog
        dojoId={ownersDojoId}
        onClose={() => setOwnersDojoId(null)}
      />

      {/* Senseis Dialog */}
      <DojoSenseisDialog
        dojoId={senseisDojoId}
        onClose={() => setSenseisDojoId(null)}
      />
    </>
  );
}

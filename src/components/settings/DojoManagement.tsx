import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojos, Dojo } from "@/hooks/useMultiDojo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Plus, Edit, Trash2, Loader2, Users, Image as ImageIcon } from "lucide-react";
import { DojoOwnersDialog } from "./DojoOwnersDialog";
import { DojoSenseisDialog } from "./DojoSenseisDialog";
import { DojoLogoUpload } from "./DojoLogoUpload";

interface DojoFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logo_url: string;
}

const initialFormData: DojoFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  description: "",
  logo_url: "",
};

export function DojoManagement() {
  const { data: dojos, isLoading } = useDojos();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [ownersDojoId, setOwnersDojoId] = useState<string | null>(null);
  const [senseisDojoId, setSenseisDojoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DojoFormData>(initialFormData);

  const createDojoMutation = useMutation({
    mutationFn: async (data: DojoFormData) => {
      const { error } = await supabase.from("dojos").insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Dojo criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
      setIsCreateOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar dojo", description: error.message, variant: "destructive" });
    },
  });

  const updateDojoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DojoFormData }) => {
      const { error } = await supabase.from("dojos").update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
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
      description: dojo.description || "",
      logo_url: dojo.logo_url || "",
    });
    setEditingDojo(dojo);
  };

  const renderFormFields = (isEdit = false) => (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-6">
        {/* Logo Upload */}
        {isEdit && editingDojo && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Logo
            </h4>
            <DojoLogoUpload
              currentLogoUrl={formData.logo_url}
              dojoId={editingDojo.id}
              onUploadComplete={(url) => setFormData({ ...formData, logo_url: url })}
            />
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Informações Básicas
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${isEdit ? 'edit' : 'create'}-name`}>Nome *</Label>
              <Input
                id={`${isEdit ? 'edit' : 'create'}-name`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do dojo"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${isEdit ? 'edit' : 'create'}-phone`}>Telefone</Label>
              <Input
                id={`${isEdit ? 'edit' : 'create'}-phone`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="h-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${isEdit ? 'edit' : 'create'}-email`}>Email</Label>
            <Input
              id={`${isEdit ? 'edit' : 'create'}-email`}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@dojo.com"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${isEdit ? 'edit' : 'create'}-address`}>Endereço</Label>
            <Input
              id={`${isEdit ? 'edit' : 'create'}-address`}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo"
              className="h-10"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${isEdit ? 'edit' : 'create'}-description`}>Descrição</Label>
            <Textarea
              id={`${isEdit ? 'edit' : 'create'}-description`}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do dojo"
              rows={3}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );

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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" aria-hidden="true" />
              Gerenciamento de Dojos
            </CardTitle>
            <CardDescription>
              Gerencie os dojos e suas configurações
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) setFormData(initialFormData);
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Novo Dojo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Dojo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo dojo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {renderFormFields(false)}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="text-right w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dojos.map((dojo) => (
                    <TableRow key={dojo.id}>
                      <TableCell className="font-medium">{dojo.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {dojo.email || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {dojo.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={dojo.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {dojo.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setOwnersDojoId(dojo.id)}
                            title="Gerenciar donos"
                            aria-label="Gerenciar donos"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSenseisDojoId(dojo.id)}
                            title="Gerenciar senseis"
                            aria-label="Gerenciar senseis"
                          >
                            <Users className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(dojo)}
                            aria-label="Editar dojo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDojo} onOpenChange={(open) => !open && setEditingDojo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Dojo</DialogTitle>
            <DialogDescription>
              Atualize as informações do dojo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {renderFormFields(true)}
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

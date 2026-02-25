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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Building2, Plus, Edit, Trash2, Loader2, Users, Image as ImageIcon, QrCode } from "lucide-react";
import { DojoSenseisDialog } from "./DojoSenseisDialog";
import { DojoLogoUpload } from "./DojoLogoUpload";
import { DojoQRCode } from "./DojoQRCode";
import { DojoMercadoPagoConfig } from "./DojoMercadoPagoConfig";

interface DojoFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logo_url: string;
  pix_key: string;
  martial_arts: string;
  signup_code: string;
}

const initialFormData: DojoFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  description: "",
  logo_url: "",
  pix_key: "",
  martial_arts: "judo",
  signup_code: "",
};

export function DojoManagement({ isSenseiView = false }: { isSenseiView?: boolean }) {
  const { data: dojos, isLoading } = useDojos();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
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
        pix_key: data.pix_key || null,
        martial_arts: data.martial_arts,
        signup_code: data.signup_code || data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase(),
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
        pix_key: data.pix_key || null,
        martial_arts: data.martial_arts,
        signup_code: data.signup_code,
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
      pix_key: (dojo as any).pix_key || "",
      martial_arts: (dojo as any).martial_arts || "judo",
      signup_code: (dojo as any).signup_code || "",
    });
    setEditingDojo(dojo);
  };

  const renderFormFields = (isEdit = false) => (
    <div className="space-y-6">
      {/* Logo Upload & QR Code */}
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
          <DojoQRCode
            dojoId={editingDojo.id}
            dojoName={editingDojo.name}
            checkinToken={(editingDojo as any).checkin_token}
            logoUrl={formData.logo_url}
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

      {/* Martial Arts & Signup Code */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          🥋 Arte Marcial & Código de Cadastro
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${isEdit ? 'edit' : 'create'}-martial_arts`}>Artes Marciais *</Label>
            <Select value={formData.martial_arts} onValueChange={(v) => setFormData({ ...formData, martial_arts: v })}>
              <SelectTrigger id={`${isEdit ? 'edit' : 'create'}-martial_arts`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="judo">Judô</SelectItem>
                <SelectItem value="bjj">Jiu-Jitsu</SelectItem>
                <SelectItem value="judo_bjj">Judô + Jiu-Jitsu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${isEdit ? 'edit' : 'create'}-signup_code`}>Código de Cadastro</Label>
            <Input
              id={`${isEdit ? 'edit' : 'create'}-signup_code`}
              value={formData.signup_code}
              onChange={(e) => setFormData({ ...formData, signup_code: e.target.value.toUpperCase().replace(/\s/g, '') })}
              placeholder="Gerado automaticamente"
              className="h-10 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Código que os alunos usam para se cadastrar. Se vazio, será gerado do nome.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit' : 'create'}-description`}>Descrição / Mensagem da Sidebar</Label>
          <Textarea
            id={`${isEdit ? 'edit' : 'create'}-description`}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Academia de Judô desde 2010"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Esta mensagem será exibida na sidebar abaixo do nome do dojo.
          </p>
        </div>
      </div>

      {/* PIX Key */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Chave Pix para Pagamentos
        </h4>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit' : 'create'}-pix_key`}>Chave Pix</Label>
          <Input
            id={`${isEdit ? 'edit' : 'create'}-pix_key`}
            value={formData.pix_key}
            onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Esta chave será exibida para os alunos na tela de pagamentos.
          </p>
        </div>
      </div>
    </div>
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
          {!isSenseiView && (
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          )}
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
                          {!isSenseiView && (
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
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(dojo)}
                            aria-label="Editar dojo"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!isSenseiView && (
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
                          )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {editingDojo && (
              <DojoMercadoPagoConfig
                dojoId={editingDojo.id}
                dojoName={editingDojo.name}
                isAdmin
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Senseis Dialog */}
      <DojoSenseisDialog
        dojoId={senseisDojoId}
        onClose={() => setSenseisDojoId(null)}
      />
    </>
  );
}

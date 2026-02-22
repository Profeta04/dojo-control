import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle, Eye, FileText, Crown, Pencil } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from "@/lib/subscriptionTiers";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Textarea } from "@/components/ui/textarea";

interface SubscriptionRow {
  id: string;
  dojo_id: string;
  tier: string;
  status: string;
  receipt_url: string | null;
  receipt_submitted_at: string | null;
  created_at: string;
  expires_at: string | null;
  approved_at: string | null;
  dojo_name: string;
}

function ReceiptPreview({ receiptUrl }: { receiptUrl: string | null }) {
  const { getSignedUrl, loading } = useSignedUrl();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (receiptUrl) {
      getSignedUrl("subscription-receipts", receiptUrl).then(setUrl);
    }
  }, [receiptUrl]);

  if (!receiptUrl) return <span className="text-muted-foreground text-sm">Sem comprovante</span>;
  if (loading || !url) return <Loader2 className="h-4 w-4 animate-spin" />;

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(receiptUrl);

  if (isImage) {
    return <img src={url} alt="Comprovante" className="max-w-full max-h-96 rounded-lg border" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
      <FileText className="h-4 w-4" /> Abrir comprovante (PDF)
    </a>
  );
}

export default function SubscriptionApprovals() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSub, setSelectedSub] = useState<SubscriptionRow | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editingSub, setEditingSub] = useState<SubscriptionRow | null>(null);
  const [editForm, setEditForm] = useState({ tier: "", status: "", expires_at: "" });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["subscription-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      const dojoIds = [...new Set(data.map((s) => s.dojo_id))];
      const { data: dojos } = await supabase
        .from("dojos")
        .select("id, name")
        .in("id", dojoIds);

      const dojoMap = new Map(dojos?.map((d) => [d.id, d.name]) || []);

      return data.map((s) => ({
        ...s,
        dojo_name: dojoMap.get(s.dojo_id) || "Dojo desconhecido",
      })) as SubscriptionRow[];
    },
    enabled: isAdmin,
  });

  const pendingSubs = subscriptions.filter((s) => s.status === "pendente");
  const activeSubs = subscriptions.filter((s) => s.status === "ativo");
  const rejectedSubs = subscriptions.filter((s) => s.status === "rejeitado");

  const handleApprove = async (sub: SubscriptionRow) => {
    setProcessing(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from("dojo_subscriptions")
        .update({
          status: "ativo",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", sub.id);

      if (error) throw error;

      toast.success(`Assinatura do ${sub.dojo_name} aprovada!`);
      setSelectedSub(null);
      queryClient.invalidateQueries({ queryKey: ["subscription-approvals"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (sub: SubscriptionRow) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("dojo_subscriptions")
        .update({ status: "rejeitado" })
        .eq("id", sub.id);

      if (error) throw error;

      toast.success(`Assinatura do ${sub.dojo_name} rejeitada.`);
      setSelectedSub(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["subscription-approvals"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao rejeitar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  const openEditSub = (sub: SubscriptionRow) => {
    setEditingSub(sub);
    setEditForm({
      tier: sub.tier,
      status: sub.status,
      expires_at: sub.expires_at ? sub.expires_at.slice(0, 10) : "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSub) return;
    setProcessing(true);
    try {
      const updateData: any = {
        tier: editForm.tier,
        status: editForm.status,
      };
      if (editForm.expires_at) {
        updateData.expires_at = new Date(editForm.expires_at).toISOString();
      }
      if (editForm.status === "ativo" && !editingSub.approved_at) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }
      const { error } = await supabase.from("dojo_subscriptions").update(updateData).eq("id", editingSub.id);
      if (error) throw error;
      toast.success("Assinatura atualizada!");
      setEditingSub(null);
      queryClient.invalidateQueries({ queryKey: ["subscription-approvals"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar assinatura");
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="border-primary text-primary">Pendente</Badge>;
      case "ativo":
        return <Badge className="bg-primary text-primary-foreground">Ativo</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tierLabel = (tier: string) => {
    const t = SUBSCRIPTION_TIERS[tier as SubscriptionTierKey];
    return t?.name || tier;
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <RequireApproval>
        <div className="space-y-6 p-4 md:p-6 max-w-6xl">
          <PageHeader
            title="Aprovação de Assinaturas"
            description="Gerencie os comprovantes de pagamento e aprove ou rejeite assinaturas dos dojos"
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Section */}
              {pendingSubs.length > 0 && (
                <Card className="border-primary/30">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Comprovantes Pendentes ({pendingSubs.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dojo</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Enviado em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingSubs.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">{sub.dojo_name}</TableCell>
                              <TableCell>{tierLabel(sub.tier)}</TableCell>
                              <TableCell>
                                {sub.receipt_submitted_at
                                  ? new Date(sub.receipt_submitted_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </TableCell>
                              <TableCell>{statusBadge(sub.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedSub(sub)}>
                                    <Eye className="h-4 w-4 mr-1" /> Ver
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(sub)}
                                    disabled={processing}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSelectedSub(sub)}
                                    disabled={processing}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {pendingSubs.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Nenhum comprovante pendente de aprovação.</p>
                  </CardContent>
                </Card>
              )}

              {/* Active subscriptions */}
              {activeSubs.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Assinaturas Ativas ({activeSubs.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dojo</TableHead>
                            <TableHead>Plano</TableHead>
                             <TableHead>Aprovado em</TableHead>
                            <TableHead>Expira em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeSubs.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">{sub.dojo_name}</TableCell>
                              <TableCell>{tierLabel(sub.tier)}</TableCell>
                              <TableCell>
                                {sub.approved_at ? new Date(sub.approved_at).toLocaleDateString("pt-BR") : "—"}
                              </TableCell>
                              <TableCell>
                                {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}
                              </TableCell>
                              <TableCell>{statusBadge(sub.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => openEditSub(sub)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rejected */}
              {rejectedSubs.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      Rejeitadas ({rejectedSubs.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dojo</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Enviado em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rejectedSubs.map((sub) => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">{sub.dojo_name}</TableCell>
                              <TableCell>{tierLabel(sub.tier)}</TableCell>
                              <TableCell>
                                {sub.receipt_submitted_at
                                  ? new Date(sub.receipt_submitted_at).toLocaleDateString("pt-BR")
                                  : "—"}
                              </TableCell>
                              <TableCell>{statusBadge(sub.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => setSelectedSub(sub)}>
                                  <Eye className="h-4 w-4 mr-1" /> Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedSub} onOpenChange={(open) => { if (!open) { setSelectedSub(null); setRejectReason(""); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Assinatura</DialogTitle>
              <DialogDescription>
                {selectedSub?.dojo_name} — Plano {selectedSub ? tierLabel(selectedSub.tier) : ""}
              </DialogDescription>
            </DialogHeader>

            {selectedSub && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <div className="mt-1">{statusBadge(selectedSub.status)}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium">{tierLabel(selectedSub.tier)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Enviado em</p>
                    <p className="font-medium">
                      {selectedSub.receipt_submitted_at
                        ? new Date(selectedSub.receipt_submitted_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                  {selectedSub.expires_at && (
                    <div>
                      <p className="text-muted-foreground">Expira em</p>
                      <p className="font-medium">
                        {new Date(selectedSub.expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Comprovante:</p>
                  <ReceiptPreview receiptUrl={selectedSub.receipt_url} />
                </div>

                {selectedSub.status === "pendente" && (
                  <div className="space-y-3 pt-2 border-t">
                    <Button
                      className="w-full"
                      onClick={() => handleApprove(selectedSub)}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Aprovar (30 dias)
                    </Button>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Motivo da rejeição (opcional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleReject(selectedSub)}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Dialog */}
        <Dialog open={!!editingSub} onOpenChange={(open) => { if (!open) setEditingSub(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Assinatura</DialogTitle>
              <DialogDescription>{editingSub?.dojo_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Plano</Label>
                <Select value={editForm.tier} onValueChange={(v) => setEditForm(p => ({ ...p, tier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTierKey[]).map(k => (
                      <SelectItem key={k} value={k}>{SUBSCRIPTION_TIERS[k].name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de expiração</Label>
                <Input type="date" value={editForm.expires_at} onChange={(e) => setEditForm(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setEditingSub(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={processing}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </RequireApproval>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dojo } from "@/hooks/useMultiDojo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { DojoLogoUpload } from "./DojoLogoUpload";
import { DojoQRCode } from "./DojoQRCode";
import { StripeConnectCard } from "./StripeConnectCard";
import { Building2, Save, Loader2, Mail, Phone, MapPin, QrCode, Image as ImageIcon } from "lucide-react";

export function SenseiDojoEdit() {
  const { user } = useAuth();
  const { data: dojos, isLoading } = useQuery({
    queryKey: ["sensei-dojos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_dojos", { _user_id: user!.id });
      if (error) throw error;
      return data as Dojo[];
    },
    enabled: !!user,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDojoId, setSelectedDojoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pixKey, setPixKey] = useState("");

  const selectedDojo = dojos?.find((d) => d.id === selectedDojoId) ?? null;

  // Auto-select first dojo
  useEffect(() => {
    if (dojos && dojos.length > 0 && !selectedDojoId) {
      setSelectedDojoId(dojos[0].id);
    }
  }, [dojos, selectedDojoId]);

  // Populate form when dojo changes
  useEffect(() => {
    if (selectedDojo) {
      setName(selectedDojo.name);
      setEmail(selectedDojo.email || "");
      setPhone(selectedDojo.phone || "");
      setAddress(selectedDojo.address || "");
      setDescription(selectedDojo.description || "");
      setLogoUrl(selectedDojo.logo_url || "");
      setPixKey(selectedDojo.pix_key || "");
    }
  }, [selectedDojo]);

  const handleSave = async () => {
    if (!selectedDojoId || !name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("dojos")
        .update({
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          description: description || null,
          logo_url: logoUrl || null,
          pix_key: pixKey || null,
        })
        .eq("id", selectedDojoId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
      toast({ title: "Dojo atualizado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (!dojos || dojos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dojo vinculado à sua conta.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Dojo Selector (only if multiple) */}
      {dojos.length > 1 && (
        <Select value={selectedDojoId || ""} onValueChange={setSelectedDojoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um dojo" />
          </SelectTrigger>
          <SelectContent>
            {dojos.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedDojo && (
        <>
          {/* Logo & QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Logo e QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DojoLogoUpload
                currentLogoUrl={logoUrl}
                dojoId={selectedDojo.id}
                onUploadComplete={(url) => setLogoUrl(url)}
              />
              <DojoQRCode
                dojoId={selectedDojo.id}
                dojoName={selectedDojo.name}
                checkinToken={selectedDojo.checkin_token}
                logoUrl={logoUrl}
              />
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Informações do Dojo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dojo-name">Nome *</Label>
                <Input
                  id="dojo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do dojo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="dojo-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@dojo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </Label>
                <Input
                  id="dojo-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo-address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Endereço
                </Label>
                <Input
                  id="dojo-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dojo-description">Descrição / Mensagem da Sidebar</Label>
                <Textarea
                  id="dojo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Academia de Judô desde 2010"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será exibida na sidebar abaixo do nome do dojo.
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </CardContent>
          </Card>

          {/* Pix Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" /> Chave Pix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dojo-pix">Chave Pix para Pagamentos</Label>
                <Input
                  id="dojo-pix"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                />
                <p className="text-xs text-muted-foreground">
                  Esta chave será exibida para os alunos na tela de pagamentos.
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <StripeConnectCard dojoId={selectedDojo.id} dojoName={selectedDojo.name} />
        </>
      )}
    </div>
  );
}

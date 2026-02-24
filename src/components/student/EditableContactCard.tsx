import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export function EditableContactCard() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // If email changed, update auth email too
      if (email && email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ phone, email })
        .eq("user_id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      setEditing(false);
      toast.success(
        email && email !== user.email
          ? "Dados atualizados! Confirme o novo email na sua caixa de entrada."
          : "Dados atualizados!"
      );
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPhone(profile?.phone || "");
    setEmail(profile?.email || "");
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Dados de Contato
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.email || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile?.phone || "Não informado"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

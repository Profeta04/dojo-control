import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Calendar, Award, Phone, Mail, Shield, ShieldOff, Pencil, Save, X, Building2, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "./AvatarUpload";
import { toast } from "sonner";

export function StudentProfileCard() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [editingContact, setEditingContact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");

  const { data: graduationHistory, isLoading: loadingGraduations } = useQuery({
    queryKey: ["student-graduation-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .eq("student_id", user.id)
        .order("graduation_date", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: dojoInfo } = useQuery({
    queryKey: ["student-dojo-info", profile?.dojo_id],
    queryFn: async () => {
      if (!profile?.dojo_id) return null;
      const { data, error } = await supabase
        .from("dojos")
        .select("name, address")
        .eq("id", profile.dojo_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.dojo_id,
  });

  const { data: studentClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ["student-classes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("class_students")
        .select(`
          class_id,
          classes:class_id (
            id,
            name,
            schedule,
            is_active
          )
        `)
        .eq("student_id", user.id);
      
      if (error) throw error;
      return data?.filter(cs => cs.classes?.is_active) || [];
    },
    enabled: !!user?.id,
  });

  const lastGraduation = graduationHistory?.[0];

  const handleSaveContact = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone, email })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      setEditingContact(false);
      toast.success("Dados atualizados!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelContact = () => {
    setPhone(profile?.phone || "");
    setEmail(profile?.email || "");
    setEditingContact(false);
  };
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-28 w-28 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFederated = (profile as any).is_federated ?? false;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          Meu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar and Belt */}
          <div className="flex flex-col items-center gap-3">
            <AvatarUpload />
            {profile.belt_grade && (
              <BeltBadge grade={profile.belt_grade as any} size="lg" />
            )}
            {/* Federated badge */}
            <Badge 
              variant={isFederated ? "default" : "secondary"} 
              className="flex items-center gap-1"
            >
              {isFederated ? (
                <><Shield className="h-3 w-3" /> Federado</>
              ) : (
                <><ShieldOff className="h-3 w-3" /> Não federado</>
              )}
            </Badge>
          </div>

          {/* Student Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{profile.name}</h3>
              {dojoInfo ? (
                <div className="mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
                        <Building2 className="h-3.5 w-3.5" />
                        {dojoInfo.name}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-2">
                        <p className="font-medium text-sm">{dojoInfo.name}</p>
                        {dojoInfo.address ? (
                          <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {dojoInfo.address}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Endereço não cadastrado</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Judoca</p>
              )}
            </div>

            {profile.birth_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(profile.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
            )}

            {/* Contact info - editable */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Contato</p>
                {!editingContact && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingContact(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                )}
              </div>
              {editingContact ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-email" className="text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-phone" className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefone
                    </Label>
                    <Input id="edit-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveContact} disabled={saving} size="sm" className="h-7">
                      <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7" onClick={handleCancelContact}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{email || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{phone || "Não informado"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Last Graduation */}
            {lastGraduation && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Última graduação:</span>
                  <span className="font-medium">
                    {format(new Date(lastGraduation.graduation_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            )}

            {/* Classes */}
            {loadingClasses ? (
              <Skeleton className="h-8 w-full" />
            ) : studentClasses && studentClasses.length > 0 ? (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Minhas Turmas:</p>
                <div className="flex flex-wrap gap-2">
                  {studentClasses.map((cs) => (
                    <span
                      key={cs.class_id}
                      className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full"
                    >
                      {cs.classes?.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Nenhuma turma vinculada</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

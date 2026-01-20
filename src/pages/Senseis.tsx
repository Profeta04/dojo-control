import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { RegistrationStatusBadge } from "@/components/shared/StatusBadge";
import { SenseiActions } from "@/components/senseis/SenseiActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserCog, Mail, Phone, Loader2 } from "lucide-react";
import { z } from "zod";
import { BELT_LABELS } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

type BeltGradeEnum = Database["public"]["Enums"]["belt_grade"];

const senseiSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  belt_grade: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export default function Senseis() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [beltGrade, setBeltGrade] = useState<string>("");
  const [password, setPassword] = useState("");

// Fetch senseis with their linked dojos
  const { data: senseis, isLoading } = useQuery({
    queryKey: ["senseis-with-dojos"],
    queryFn: async () => {
      // Get all users with sensei role
      const { data: senseiRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sensei");

      if (!senseiRoles || senseiRoles.length === 0) return [];

      const userIds = senseiRoles.map((r) => r.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds)
        .order("name");

      if (!profiles) return [];

      // Fetch dojo links for all senseis
      const { data: dojoLinks } = await supabase
        .from("dojo_senseis")
        .select("sensei_id, dojo_id, dojos(id, name)")
        .in("sensei_id", userIds);

      // Create a map of user_id to their dojos
      const dojosByUser: Record<string, { id: string; name: string }[]> = {};
      for (const link of dojoLinks || []) {
        if (!dojosByUser[link.sensei_id]) {
          dojosByUser[link.sensei_id] = [];
        }
        if (link.dojos) {
          dojosByUser[link.sensei_id].push({
            id: (link.dojos as { id: string; name: string }).id,
            name: (link.dojos as { id: string; name: string }).name,
          });
        }
      }

      return profiles.map((profile) => ({
        ...profile,
        linkedDojos: dojosByUser[profile.user_id] || [],
      }));
    },
    enabled: !!user && isAdmin,
  });

  // Redirect if not admin
  if (!authLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setBeltGrade("");
    setPassword("");
  };

  const handleCreateSensei = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = senseiSchema.safeParse({ name, email, phone, belt_grade: beltGrade, password });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário");

      const userId = authData.user.id;

      // 2. Update profile with additional info
      const updateData: { phone?: string; belt_grade?: BeltGradeEnum; registration_status: 'aprovado'; approved_at: string; approved_by: string } = {
        registration_status: "aprovado",
        approved_at: new Date().toISOString(),
        approved_by: user!.id,
      };
      
      if (phone) updateData.phone = phone;
      if (beltGrade) updateData.belt_grade = beltGrade as BeltGradeEnum;

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      // 3. Assign sensei role
      await supabase.rpc("assign_user_role", {
        _user_id: userId,
        _role: "sensei",
      });

      toast({
        title: "Sensei cadastrado!",
        description: `${name} foi cadastrado com sucesso.`,
      });

      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["senseis"] });
    } catch (error: any) {
      let message = "Erro ao cadastrar sensei";
      if (error.message?.includes("already registered")) {
        message = "Este email já está cadastrado";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  // Filter to only show black belts as options for senseis
  const blackBelts = Object.entries(BELT_LABELS).filter(([key]) =>
    key.startsWith("preta")
  );

  return (
    <RequireApproval>
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Senseis"
          description="Gerencie os senseis do dojo"
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent hover:bg-accent/90 self-start sm:self-auto">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Sensei
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Sensei</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo sensei no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSensei} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do sensei"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sensei@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha inicial *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="belt">Graduação</Label>
                <Select value={beltGrade} onValueChange={setBeltGrade}>
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
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-accent hover:bg-accent/90"
                  disabled={formLoading}
                >
                  {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Cadastrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5" />
            Lista de Senseis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {senseis && senseis.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="hidden sm:table-cell">Dojos</TableHead>
                    <TableHead>Faixa</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="w-12">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senseis.map((sensei) => (
                    <TableRow key={sensei.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sensei.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden truncate max-w-[150px]">
                            {sensei.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{sensei.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {sensei.phone ? (
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {sensei.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {sensei.linkedDojos && sensei.linkedDojos.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {sensei.linkedDojos.slice(0, 2).map((dojo: { id: string; name: string }) => (
                              <span
                                key={dojo.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary truncate max-w-[70px]"
                                title={dojo.name}
                              >
                                {dojo.name}
                              </span>
                            ))}
                            {sensei.linkedDojos.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{sensei.linkedDojos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sensei.belt_grade ? (
                          <BeltBadge grade={sensei.belt_grade} size="sm" />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <RegistrationStatusBadge status={sensei.registration_status || "pendente"} />
                      </TableCell>
                      <TableCell>
                        <SenseiActions sensei={sensei} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum sensei cadastrado ainda.</p>
              <p className="text-sm">Clique em "Cadastrar Sensei" para adicionar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
    </RequireApproval>
  );
}
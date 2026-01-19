import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, UserPlus, Building, User } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInYears, parse, isValid } from "date-fns";
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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  confirmPassword: z.string(),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const guardianSchema = z.object({
  guardianEmail: z.string().email("Email do responsável inválido"),
  guardianPassword: z.string().min(6, "A senha do responsável deve ter pelo menos 6 caracteres"),
  guardianConfirmPassword: z.string(),
}).refine((data) => data.guardianPassword === data.guardianConfirmPassword, {
  message: "As senhas do responsável não coincidem",
  path: ["guardianConfirmPassword"],
});

function calculateAge(birthDateStr: string): number | null {
  const birthDate = parse(birthDateStr, "yyyy-MM-dd", new Date());
  if (!isValid(birthDate)) return null;
  return differenceInYears(new Date(), birthDate);
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupBirthDate, setSignupBirthDate] = useState("");
  const [selectedDojoId, setSelectedDojoId] = useState("");
  const [selectedSenseiId, setSelectedSenseiId] = useState("");
  
  // Guardian form
  const [addGuardian, setAddGuardian] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPassword, setGuardianPassword] = useState("");
  const [guardianConfirmPassword, setGuardianConfirmPassword] = useState("");

  // Forgot password
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const isMinor = useMemo(() => {
    if (!signupBirthDate) return false;
    const age = calculateAge(signupBirthDate);
    return age !== null && age < 18;
  }, [signupBirthDate]);

  // Fetch dojos
  const { data: dojos = [] } = useQuery({
    queryKey: ["dojos-for-signup"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_dojos_public");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Fetch senseis for the selected dojo
  const { data: senseis = [] } = useQuery({
    queryKey: ["senseis-for-signup", selectedDojoId],
    queryFn: async () => {
      if (!selectedDojoId) return [];
      
      // Get sensei user ids linked to this dojo
      const { data: dojoSenseis } = await supabase
        .from("dojo_senseis")
        .select("user_id")
        .eq("dojo_id", selectedDojoId);

      if (!dojoSenseis || dojoSenseis.length === 0) return [];

      const senseiUserIds = dojoSenseis.map((ds) => ds.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", senseiUserIds);

      return (profiles || []).map((p) => ({ id: p.user_id, name: p.name }));
    },
    enabled: !!selectedDojoId,
  });

  // Reset sensei when dojo changes
  useEffect(() => {
    setSelectedSenseiId("");
  }, [selectedDojoId]);

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  // Reset guardian fields when not a minor
  useEffect(() => {
    if (!isMinor) {
      setAddGuardian(false);
      setGuardianEmail("");
      setGuardianPassword("");
      setGuardianConfirmPassword("");
    }
  }, [isMinor]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira seu email",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setForgotPasswordLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o email de recuperação. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Email enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    setForgotPasswordOpen(false);
    setForgotPasswordEmail("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast({
        title: "Erro de validação",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      let message = "Erro ao fazer login";
      if (error.message.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos";
      }
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dojo selection
    if (!selectedDojoId) {
      toast({
        title: "Erro de validação",
        description: "Selecione o dojo",
        variant: "destructive",
      });
      return;
    }
    
    // Validate student data
    const studentResult = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      name: signupName,
      confirmPassword: signupConfirmPassword,
      birthDate: signupBirthDate,
    });
    
    if (!studentResult.success) {
      toast({
        title: "Erro de validação",
        description: studentResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Validate guardian data if minor wants to add guardian
    if (isMinor && addGuardian) {
      const guardianResult = guardianSchema.safeParse({
        guardianEmail,
        guardianPassword,
        guardianConfirmPassword,
      });
      
      if (!guardianResult.success) {
        toast({
          title: "Erro de validação",
          description: guardianResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Check if guardian email is the same as student email
      if (guardianEmail === signupEmail) {
        toast({
          title: "Erro de validação",
          description: "O email do responsável deve ser diferente do email do aluno",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    
    try {
      let guardianUserId: string | null = null;

      // Create guardian account first if needed
      if (isMinor && addGuardian) {
        const { data: guardianData, error: guardianError } = await supabase.auth.signUp({
          email: guardianEmail,
          password: guardianPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: `Responsável de ${signupName}`,
            },
          },
        });

        if (guardianError) {
          let message = "Erro ao criar conta do responsável";
          if (guardianError.message.includes("already registered")) {
            message = "O email do responsável já está cadastrado";
          }
          toast({
            title: "Erro",
            description: message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        guardianUserId = guardianData.user?.id || null;
      }

      // Create student account
      const { data: studentData, error: studentError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: signupName,
          },
        },
      });

      if (studentError) {
        let message = "Erro ao criar conta";
        if (studentError.message.includes("already registered")) {
          message = "Este email já está cadastrado";
        }
        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update student profile with birth_date, guardian info, and dojo
      if (studentData.user) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            birth_date: signupBirthDate,
            guardian_user_id: guardianUserId,
            guardian_email: isMinor && addGuardian ? guardianEmail : null,
            dojo_id: selectedDojoId || null,
          })
          .eq("user_id", studentData.user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
        }
      }

      toast({
        title: "Conta criada com sucesso!",
        description: isMinor && addGuardian 
          ? "Seu cadastro e do responsável estão pendentes de aprovação." 
          : "Seu cadastro está pendente de aprovação por um Sensei.",
      });

      // Clear form
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setSignupBirthDate("");
      setSelectedDojoId("");
      setSelectedSenseiId("");
      setGuardianEmail("");
      setGuardianPassword("");
      setGuardianConfirmPassword("");
      setAddGuardian(false);

    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary mb-3 sm:mb-4 shadow-lg">
          <span className="text-3xl sm:text-4xl">🥋</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Dojo Manager</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Sistema de Gestão do Dojo de Judô</p>
      </div>

      <Card className="w-full max-w-md border-border shadow-lg">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="login" className="text-sm">Entrar</TabsTrigger>
            <TabsTrigger value="signup" className="text-sm">Cadastrar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
                <CardDescription>
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <Button type="submit" className="w-full h-10 bg-accent hover:bg-accent/90" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground text-sm"
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Esqueci minha senha
                </Button>
              </CardContent>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardHeader>
                <CardTitle>Cadastro de Aluno</CardTitle>
                <CardDescription>
                  Preencha seus dados para se cadastrar como aluno do dojo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dojo Selection */}
                <div className="space-y-2">
                  <Label htmlFor="signup-dojo" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Dojo *
                  </Label>
                  <Select value={selectedDojoId} onValueChange={setSelectedDojoId}>
                    <SelectTrigger id="signup-dojo" className="h-10">
                      <SelectValue placeholder="Selecione seu dojo" />
                    </SelectTrigger>
                    <SelectContent>
                      {dojos.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum dojo disponível
                        </SelectItem>
                      ) : (
                        dojos.map((dojo) => (
                          <SelectItem key={dojo.id} value={dojo.id}>
                            {dojo.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sensei Selection (Optional) */}
                {selectedDojoId && senseis.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-sensei" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Sensei <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Select value={selectedSenseiId} onValueChange={setSelectedSenseiId}>
                      <SelectTrigger id="signup-sensei" className="h-10">
                        <SelectValue placeholder="Selecione seu sensei" />
                      </SelectTrigger>
                      <SelectContent>
                        {senseis.map((sensei) => (
                          <SelectItem key={sensei.id} value={sensei.id}>
                            {sensei.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-birthdate">Data de nascimento</Label>
                  <div className="relative">
                    <Input
                      id="signup-birthdate"
                      type="date"
                      value={signupBirthDate}
                      onChange={(e) => setSignupBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                      className="pr-10 h-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {signupBirthDate && (
                    <p className="text-xs text-muted-foreground">
                      Idade: {calculateAge(signupBirthDate)} anos
                      {isMinor && " (menor de idade)"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                {/* Guardian section for minors */}
                {isMinor && (
                  <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="add-guardian"
                        checked={addGuardian}
                        onCheckedChange={(checked) => setAddGuardian(checked === true)}
                      />
                      <Label htmlFor="add-guardian" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Adicionar conta de responsável
                      </Label>
                    </div>
                    
                    {addGuardian && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          O responsável poderá acessar e gerenciar a conta do aluno menor de idade.
                        </p>
                        
                        <div className="space-y-2">
                          <Label htmlFor="guardian-email">Email do responsável</Label>
                          <Input
                            id="guardian-email"
                            type="email"
                            placeholder="responsavel@email.com"
                            value={guardianEmail}
                            onChange={(e) => setGuardianEmail(e.target.value)}
                            required={addGuardian}
                            className="h-10"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="guardian-password">Senha do responsável</Label>
                          <Input
                            id="guardian-password"
                            type="password"
                            placeholder="••••••••"
                            value={guardianPassword}
                            onChange={(e) => setGuardianPassword(e.target.value)}
                            required={addGuardian}
                            className="h-10"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="guardian-confirm-password">Confirmar senha do responsável</Label>
                          <Input
                            id="guardian-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            value={guardianConfirmPassword}
                            onChange={(e) => setGuardianConfirmPassword(e.target.value)}
                            required={addGuardian}
                            className="h-10"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full h-10 bg-accent hover:bg-accent/90" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Cadastrar
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Seu cadastro será analisado e aprovado por um Sensei
                </p>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Insira seu email para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotPasswordOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={forgotPasswordLoading}>
                {forgotPasswordLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

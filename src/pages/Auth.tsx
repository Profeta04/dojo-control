import { useState, useEffect, useMemo } from "react";
import dojoLogo from "@/assets/dojo-control-logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, UserPlus, Building, User, Eye, EyeOff, Award, ArrowLeft, ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { BELT_LABELS, BeltGrade } from "@/lib/constants";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

function calculateAge(birthDateStr: string): number | null {
  const birthDate = parse(birthDateStr, "yyyy-MM-dd", new Date());
  if (!isValid(birthDate)) return null;
  return differenceInYears(new Date(), birthDate);
}

// Belt options
const JUDO_BELTS: { value: BeltGrade; label: string }[] = [
  { value: "branca", label: "Branca" },
  { value: "bordo", label: "Bordô" },
  { value: "cinza", label: "Cinza" },
  { value: "azul_escura", label: "Azul Escura" },
  { value: "azul", label: "Azul" },
  { value: "amarela", label: "Amarela" },
  { value: "laranja", label: "Laranja" },
  { value: "verde", label: "Verde" },
  { value: "roxa", label: "Roxa" },
  { value: "marrom", label: "Marrom" },
  { value: "preta_1dan", label: "Preta 1º Dan" },
  { value: "preta_2dan", label: "Preta 2º Dan" },
  { value: "preta_3dan", label: "Preta 3º Dan" },
  { value: "preta_4dan", label: "Preta 4º Dan" },
  { value: "preta_5dan", label: "Preta 5º Dan" },
];

const BJJ_BELTS: { value: BeltGrade; label: string }[] = [
  { value: "branca", label: "Branca" },
  { value: "cinza", label: "Cinza" },
  { value: "amarela", label: "Amarela" },
  { value: "laranja", label: "Laranja" },
  { value: "verde", label: "Verde" },
  { value: "azul", label: "Azul" },
  { value: "roxa", label: "Roxa" },
  { value: "marrom", label: "Marrom" },
  { value: "preta_1dan", label: "Preta 1º Dan" },
  { value: "preta_2dan", label: "Preta 2º Dan" },
  { value: "preta_3dan", label: "Preta 3º Dan" },
];

type DojoInfo = { id: string; name: string; martial_arts: string; logo_url: string | null; color_primary: string | null; color_secondary: string | null; color_accent: string | null };

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signIn, loading: authLoading } = useAuth();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const mode = searchParams.get("mode") || "login";
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot password
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Signup wizard state
  const [signupStep, setSignupStep] = useState(1);
  
  // Step 1: Personal info
  const [signupName, setSignupName] = useState("");
  const [signupBirthDate, setSignupBirthDate] = useState("");
  const [dojoCode, setDojoCode] = useState("");
  const [dojoInfo, setDojoInfo] = useState<DojoInfo | null>(null);
  const [dojoLookupLoading, setDojoLookupLoading] = useState(false);
  const [dojoLookupError, setDojoLookupError] = useState("");
  const [dojoLogoUrl, setDojoLogoUrl] = useState<string | null>(null);
  const [selectedSenseiId, setSelectedSenseiId] = useState("");

  // Step 2: Belt
  const [judoBelt, setJudoBelt] = useState<BeltGrade | "none">("branca");
  const [bjjBelt, setBjjBelt] = useState<BeltGrade | "none">("branca");
  const [skipJudo, setSkipJudo] = useState(false);
  const [skipBjj, setSkipBjj] = useState(false);

  // Step 3: Guardian (if minor)
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPassword, setGuardianPassword] = useState("");
  const [guardianConfirmPassword, setGuardianConfirmPassword] = useState("");
  const [showGuardianPassword, setShowGuardianPassword] = useState(false);
  const [showGuardianConfirmPassword, setShowGuardianConfirmPassword] = useState(false);

  // Step 4: Credentials
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const isMinor = useMemo(() => {
    if (!signupBirthDate) return false;
    const age = calculateAge(signupBirthDate);
    return age !== null && age < 18;
  }, [signupBirthDate]);

  const totalSteps = isMinor ? 4 : 3;
  const credentialsStep = isMinor ? 4 : 3;
  const guardianStep = 3; // only if minor

  // Fetch senseis for dojo
  const { data: senseis = [] } = useQuery({
    queryKey: ["senseis-for-signup", dojoInfo?.id],
    queryFn: async () => {
      if (!dojoInfo?.id) return [];
      const { data: dojoSenseis } = await supabase
        .from("dojo_senseis")
        .select("sensei_id")
        .eq("dojo_id", dojoInfo.id);
      if (!dojoSenseis || dojoSenseis.length === 0) return [];
      const senseiUserIds = dojoSenseis.map((ds) => ds.sensei_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", senseiUserIds);
      return (profiles || []).map((p) => ({ id: p.user_id, name: p.name }));
    },
    enabled: !!dojoInfo?.id,
  });

  // Lookup dojo by code
  const lookupDojo = async (code: string) => {
    if (code.length < 3) {
      setDojoInfo(null);
      setDojoLookupError("");
      return;
    }
    setDojoLookupLoading(true);
    setDojoLookupError("");
    try {
      const { data, error } = await supabase.rpc("get_dojo_by_signup_code", { _code: code });
      if (error) throw error;
      if (data && data.length > 0) {
        const d = data[0] as DojoInfo;
        setDojoInfo(d);
        // Load logo
        if (d.logo_url) {
          if (d.logo_url.startsWith("http")) {
            setDojoLogoUrl(d.logo_url);
          } else {
            const { data: signedData } = await supabase.storage
              .from("dojo-logos")
              .createSignedUrl(d.logo_url, 3600);
            setDojoLogoUrl(signedData?.signedUrl || null);
          }
        } else {
          setDojoLogoUrl(null);
        }
        // Apply dojo theme colors from RPC data
        const root = document.documentElement;
        if (d.color_accent) {
          root.style.setProperty("--accent", d.color_accent);
          root.style.setProperty("--ring", d.color_accent);
          root.style.setProperty("--sidebar-primary", d.color_accent);
        }
        if (d.color_primary) {
          root.style.setProperty("--sidebar-background", d.color_primary);
        }
        if (d.color_secondary) {
          root.style.setProperty("--secondary", d.color_secondary);
        }
      } else {
        setDojoInfo(null);
        setDojoLogoUrl(null);
        setDojoLookupError("Código de dojo não encontrado");
      }
    } catch {
      setDojoLookupError("Erro ao buscar dojo");
    } finally {
      setDojoLookupLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dojoCode.length >= 3) lookupDojo(dojoCode);
      else { setDojoInfo(null); setDojoLookupError(""); }
    }, 500);
    return () => clearTimeout(timer);
  }, [dojoCode]);

  useEffect(() => {
    setSelectedSenseiId("");
  }, [dojoInfo?.id]);

  useEffect(() => {
    if (user && !authLoading) navigate(redirectTo);
  }, [user, authLoading, navigate, redirectTo]);

  // Validate password strength client-side
  const validatePassword = (password: string, label: string): string | null => {
    if (password.length < 8) return `${label} deve ter pelo menos 8 caracteres`;
    if (!/[a-zA-Z]/.test(password)) return `${label} deve conter letras`;
    if (!/[0-9]/.test(password)) return `${label} deve conter números`;
    return null;
  };

  // Validation per step
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!signupName.trim() || signupName.trim().length < 2) {
        toast({ title: "Nome deve ter pelo menos 2 caracteres", variant: "destructive" });
        return false;
      }
      if (!signupBirthDate) {
        toast({ title: "Data de nascimento é obrigatória", variant: "destructive" });
        return false;
      }
      if (!dojoInfo) {
        toast({ title: "Insira um código de dojo válido", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (step === 2) {
      const ma = dojoInfo?.martial_arts;
      if (ma === "judo_bjj" && skipJudo && skipBjj) {
        toast({ title: "Você deve praticar pelo menos uma arte marcial", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (step === guardianStep && isMinor) {
      if (!guardianEmail) {
        toast({ title: "Email do responsável é obrigatório", variant: "destructive" });
        return false;
      }
      const emailResult = z.string().email().safeParse(guardianEmail);
      if (!emailResult.success) {
        toast({ title: "Email do responsável inválido", variant: "destructive" });
        return false;
      }
      const gPwdErr = validatePassword(guardianPassword, "Senha do responsável");
      if (gPwdErr) {
        toast({ title: gPwdErr, variant: "destructive" });
        return false;
      }
      if (guardianPassword !== guardianConfirmPassword) {
        toast({ title: "Senhas do responsável não coincidem", variant: "destructive" });
        return false;
      }
      return true;
    }
    if (step === credentialsStep) {
      const emailResult = z.string().email().safeParse(signupEmail);
      if (!emailResult.success) {
        toast({ title: "Email do aluno inválido", variant: "destructive" });
        return false;
      }
      const pwdErr = validatePassword(signupPassword, "Senha");
      if (pwdErr) {
        toast({ title: pwdErr, variant: "destructive" });
        return false;
      }
      if (signupPassword !== signupConfirmPassword) {
        toast({ title: "Senhas não coincidem", variant: "destructive" });
        return false;
      }
      if (isMinor && guardianEmail === signupEmail) {
        toast({ title: "Email do aluno deve ser diferente do responsável", variant: "destructive" });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(signupStep)) return;
    // If step 2 and not minor, go to credentials (step 3)
    if (signupStep === 2 && !isMinor) {
      setSignupStep(3);
    } else {
      setSignupStep(signupStep + 1);
    }
  };

  const handleBack = () => {
    if (signupStep === credentialsStep && !isMinor && credentialsStep === 3) {
      setSignupStep(2);
    } else {
      setSignupStep(signupStep - 1);
    }
  };

  const handleSignup = async () => {
    // Re-validate all steps before submitting
    for (let s = 1; s <= totalSteps; s++) {
      // Skip guardian step if not minor
      if (s === guardianStep && !isMinor) continue;
      if (!validateStep(s)) {
        setSignupStep(s);
        return;
      }
    }

    setLoading(true);
    try {
      // Determine belt_grade
      const ma = dojoInfo?.martial_arts;
      let beltGrade: string = "branca";
      if (ma === "judo" || (ma === "judo_bjj" && !skipJudo)) beltGrade = judoBelt as string;
      else if (ma === "bjj" || (ma === "judo_bjj" && skipJudo && !skipBjj)) beltGrade = bjjBelt as string;

      let guardianUserId: string | null = null;

      // Create guardian account first if minor
      if (isMinor) {
        // Sign out any existing session first
        await supabase.auth.signOut();

        const { data: guardianData, error: guardianError } = await supabase.auth.signUp({
          email: guardianEmail,
          password: guardianPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: `Responsável de ${signupName}`, is_guardian: true },
          },
        });

        if (guardianError) {
          let message = "Erro ao criar conta do responsável";
          if (guardianError.message.includes("already registered")) {
            message = "O email do responsável já está cadastrado";
          } else if (guardianError.message.includes("weak") || guardianError.message.includes("password")) {
            message = "Senha do responsável é muito fraca. Use pelo menos 8 caracteres com letras e números.";
          }
          toast({ title: "Erro", description: message, variant: "destructive" });
          setLoading(false);
          return;
        }

        guardianUserId = guardianData.user?.id || null;

        // Sign out guardian session immediately to not mix sessions
        await supabase.auth.signOut();
      }

      // Determine per-art belts for the trigger
      const judoBeltValue = (ma === "judo" || ma === "judo_bjj") && !skipJudo ? (judoBelt as string) : "branca";
      const bjjBeltValue = (ma === "bjj" || ma === "judo_bjj") && !skipBjj ? (bjjBelt as string) : "branca";

      // Create student account - pass all data via metadata so the trigger handles it
      // This way dojo_id, birth_date, etc. are set even without an authenticated session
      const { data: studentData, error: studentError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: signupName,
            dojo_id: dojoInfo?.id || "",
            birth_date: signupBirthDate || "",
            guardian_email: isMinor ? guardianEmail : "",
            guardian_user_id: guardianUserId || "",
            belt_grade: beltGrade,
            judo_belt: judoBeltValue,
            bjj_belt: bjjBeltValue,
          },
        },
      });

      if (studentError) {
        let message = "Erro ao criar conta";
        if (studentError.message.includes("already registered")) {
          message = "Este email já está cadastrado";
        } else if (studentError.message.includes("weak") || studentError.message.includes("password") || studentError.message.includes("Password")) {
          message = "A senha é muito fraca. Use pelo menos 8 caracteres com letras e números.";
        }
        toast({ title: "Erro", description: message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Double check: if user was created but there's a weak password indicator
      if (!studentData.user) {
        toast({ title: "Erro", description: "Erro ao criar conta. Tente novamente.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Sign out student session immediately - student must wait for approval
      await supabase.auth.signOut();

      // Save belt records in student_belts using an edge function or just try it
      // Since we signed out, we need to handle this differently
      // The belt inserts need auth - we'll handle this via a separate mechanism
      // For now, belts will be set during approval by the sensei

      // Notify
      if (dojoInfo?.id) {
        void supabase.functions.invoke("notify-new-student-registration", {
          body: { studentName: signupName, dojoId: dojoInfo.id },
        });
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Seu cadastro está pendente de aprovação pelo Sensei.",
      });

      // Switch to login mode
      setSearchParams({ mode: "login" });

      // Reset
      setSignupStep(1);
      setSignupName("");
      setSignupBirthDate("");
      setDojoCode("");
      setDojoInfo(null);
      setSelectedSenseiId("");
      setJudoBelt("branca");
      setBjjBelt("branca");
      setSkipJudo(false);
      setSkipBjj(false);
      setGuardianEmail("");
      setGuardianPassword("");
      setGuardianConfirmPassword("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (error) {
      console.error("Signup error:", error);
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      toast({ title: "Erro de validação", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast({
        title: "Erro",
        description: error.message.includes("Invalid login credentials") ? "Email ou senha incorretos" : "Erro ao fazer login",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast({ title: "Erro", description: "Por favor, insira seu email", variant: "destructive" });
      return;
    }
    setForgotPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotPasswordLoading(false);
    if (error) {
      toast({ title: "Erro", description: "Ocorreu um erro ao enviar o email de recuperação.", variant: "destructive" });
      return;
    }
    toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
    setForgotPasswordOpen(false);
    setForgotPasswordEmail("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Step indicator
  const StepIndicator = () => {
    const steps = isMinor
      ? [
          { num: 1, label: "Dados" },
          { num: 2, label: "Graduação" },
          { num: 3, label: "Responsável" },
          { num: 4, label: "Credenciais" },
        ]
      : [
          { num: 1, label: "Dados" },
          { num: 2, label: "Graduação" },
          { num: 3, label: "Credenciais" },
        ];

    return (
      <div className="flex items-center justify-center gap-1 mb-4">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                signupStep === s.num
                  ? "bg-accent text-accent-foreground"
                  : signupStep > s.num
                  ? "bg-accent/20 text-accent"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {signupStep > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-6 h-0.5", signupStep > s.num ? "bg-accent/40" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Belt selection component
  const BeltSelector = ({
    title,
    belts,
    selected,
    onSelect,
    skipped,
    onSkipChange,
    showSkip,
  }: {
    title: string;
    belts: { value: BeltGrade; label: string }[];
    selected: BeltGrade;
    onSelect: (b: BeltGrade) => void;
    skipped: boolean;
    onSkipChange: (s: boolean) => void;
    showSkip: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {showSkip && (
          <button
            type="button"
            onClick={() => onSkipChange(!skipped)}
            className={cn(
              "text-xs px-2 py-1 rounded-md transition-colors",
              skipped ? "bg-accent/15 text-accent font-medium" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {skipped ? "✓ Não pratico" : "Não pratico esta arte"}
          </button>
        )}
      </div>
      {!skipped && (
        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
          {belts.map((belt) => (
            <button
              key={belt.value}
              type="button"
              onClick={() => onSelect(belt.value)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                selected === belt.value
                  ? "bg-accent/15 ring-1 ring-accent text-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <BeltBadge grade={belt.value} size="sm" />
              <span>{belt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/4" />
      </div>
      
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 relative z-10">
        <img
          src={(mode === "signup" && dojoLogoUrl) ? dojoLogoUrl : dojoLogo}
          alt={(mode === "signup" && dojoLogoUrl) ? "Logo do Dojo" : "Dojo Control"}
          className="w-20 h-20 sm:w-24 sm:h-24 mb-2 border-2 border-border rounded-full mx-auto object-cover shadow-lg"
        />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {(mode === "signup" && dojoInfo?.name) ? dojoInfo.name : "Dojo Control"}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Sistema de Gestão do Dojo</p>
      </div>

      <Card className="w-full max-w-md border-border shadow-xl relative z-10">
        {/* LOGIN VIEW */}
        {mode === "login" && (
          <>
            <form onSubmit={handleLogin}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
                <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="h-10 pr-10" />
                    <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-10 bg-accent hover:bg-accent/90" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Entrar
                </Button>
                <Button type="button" variant="link" className="w-full text-muted-foreground text-sm" onClick={() => setForgotPasswordOpen(true)}>
                  Esqueci minha senha
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-accent hover:underline"
                    onClick={() => setSearchParams({ mode: "signup" })}
                  >
                    Não tem conta? Cadastre-se
                  </button>
                </div>
              </CardContent>
            </form>
          </>
        )}

        {/* SIGNUP VIEW - Multi-step wizard */}
        {mode === "signup" && (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Cadastro de Aluno</CardTitle>
              <CardDescription>Preencha seus dados para se cadastrar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <StepIndicator />

              {/* STEP 1: Personal Info */}
              {signupStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-code" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Código do Dojo *
                    </Label>
                    <Input
                      id="signup-code"
                      placeholder="Ex: ACADEMIASP"
                      value={dojoCode}
                      onChange={(e) => setDojoCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                      className="h-10 font-mono"
                    />
                    {dojoLookupLoading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Buscando...</p>}
                    {dojoLookupError && <p className="text-xs text-destructive">{dojoLookupError}</p>}
                    {dojoInfo && (
                      <p className="text-xs text-accent flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {dojoInfo.name}
                      </p>
                    )}
                  </div>

                  {dojoInfo && senseis.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><User className="h-4 w-4" />Sensei <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                      <Select value={selectedSenseiId} onValueChange={setSelectedSenseiId}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecione seu sensei" /></SelectTrigger>
                        <SelectContent>
                          {senseis.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo *</Label>
                    <Input id="signup-name" placeholder="Seu nome" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="h-10" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-birthdate">Data de nascimento *</Label>
                    <div className="relative">
                      <Input id="signup-birthdate" type="date" value={signupBirthDate} onChange={(e) => setSignupBirthDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="pr-10 h-10" />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                    {signupBirthDate && (
                      <p className="text-xs text-muted-foreground">
                        Idade: {calculateAge(signupBirthDate)} anos{isMinor && " (menor de idade)"}
                      </p>
                    )}
                  </div>

                  <Button type="button" className="w-full h-10 bg-accent hover:bg-accent/90" onClick={handleNext}>
                    Próximo <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-accent hover:underline"
                      onClick={() => { setSearchParams({ mode: "login" }); setSignupStep(1); }}
                    >
                      Já tem conta? Entrar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Belt Selection */}
              {signupStep === 2 && dojoInfo && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="h-4 w-4" />
                    Selecione sua graduação atual
                  </div>

                  {(dojoInfo.martial_arts === "judo" || dojoInfo.martial_arts === "judo_bjj") && (
                    <BeltSelector
                      title="🥋 Judô"
                      belts={JUDO_BELTS}
                      selected={judoBelt as BeltGrade}
                      onSelect={(b) => setJudoBelt(b)}
                      skipped={skipJudo}
                      onSkipChange={setSkipJudo}
                      showSkip={dojoInfo.martial_arts === "judo_bjj"}
                    />
                  )}

                  {(dojoInfo.martial_arts === "bjj" || dojoInfo.martial_arts === "judo_bjj") && (
                    <BeltSelector
                      title="🥋 Jiu-Jitsu"
                      belts={BJJ_BELTS}
                      selected={bjjBelt as BeltGrade}
                      onSelect={(b) => setBjjBelt(b)}
                      skipped={skipBjj}
                      onSkipChange={setSkipBjj}
                      showSkip={dojoInfo.martial_arts === "judo_bjj"}
                    />
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 h-10" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button type="button" className="flex-1 h-10 bg-accent hover:bg-accent/90" onClick={handleNext}>
                      Próximo <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3 (if minor): Guardian */}
              {signupStep === guardianStep && isMinor && (
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-accent" />
                      Cadastro do Responsável
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Como aluno menor de idade, é obrigatório o cadastro de um responsável.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-email">Email do responsável *</Label>
                      <Input id="guardian-email" type="email" placeholder="responsavel@email.com" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-password">Senha do responsável *</Label>
                      <div className="relative">
                        <Input id="guardian-password" type={showGuardianPassword ? "text" : "password"} placeholder="••••••••" value={guardianPassword} onChange={(e) => setGuardianPassword(e.target.value)} className="h-10 pr-10" />
                        <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowGuardianPassword(!showGuardianPassword)}>
                          {showGuardianPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardian-confirm">Confirmar senha *</Label>
                      <div className="relative">
                        <Input id="guardian-confirm" type={showGuardianConfirmPassword ? "text" : "password"} placeholder="••••••••" value={guardianConfirmPassword} onChange={(e) => setGuardianConfirmPassword(e.target.value)} className="h-10 pr-10" />
                        <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowGuardianConfirmPassword(!showGuardianConfirmPassword)}>
                          {showGuardianConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 h-10" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button type="button" className="flex-1 h-10 bg-accent hover:bg-accent/90" onClick={handleNext}>
                      Próximo <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3/4: Credentials */}
              {signupStep === credentialsStep && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email do aluno *</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha *</Label>
                    <div className="relative">
                      <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="h-10 pr-10" />
                      <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha *</Label>
                    <div className="relative">
                      <Input id="signup-confirm" type={showSignupConfirmPassword ? "text" : "password"} placeholder="••••••••" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className="h-10 pr-10" />
                      <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}>
                        {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 h-10" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button type="button" className="flex-1 h-10 bg-accent hover:bg-accent/90" onClick={handleSignup} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Cadastrar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Seu cadastro será analisado e aprovado por um Sensei
                  </p>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>Insira seu email para receber um link de recuperação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input id="forgot-email" type="email" placeholder="seu@email.com" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} required className="h-10" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={forgotPasswordLoading}>
                {forgotPasswordLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

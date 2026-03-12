import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Users, Mail, KeyRound, GraduationCap, Trash2 } from "lucide-react";
import { BELT_LABELS, BeltGrade } from "@/lib/constants";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

// ─── Approval Dialog ───────────────────────────────────────
interface ApprovalDialogProps {
  actionType: "approve" | "reject" | null;
  selectedStudent: Profile | null;
  approvalBelts: { martial_art: string; belt_grade: BeltGrade }[];
  loadingBelts: boolean;
  actionLoading: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBeltChange: (index: number, value: BeltGrade) => void;
}

export function ApprovalDialog({
  actionType, selectedStudent, approvalBelts, loadingBelts, actionLoading,
  onClose, onApprove, onReject, onBeltChange,
}: ApprovalDialogProps) {
  return (
    <AlertDialog open={!!actionType} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionType === "approve" ? "Aprovar Aluno" : "Rejeitar Cadastro"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {actionType === "approve"
              ? `Tem certeza que deseja aprovar o cadastro de ${selectedStudent?.name}? O aluno poderá acessar o sistema.`
              : `Tem certeza que deseja rejeitar o cadastro de ${selectedStudent?.name}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {actionType === "approve" && (
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Confirmação de Faixa(s)</label>
            {loadingBelts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando faixas...
              </div>
            ) : approvalBelts.length > 0 ? (
              approvalBelts.map((belt, idx) => (
                <div key={belt.martial_art} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    🥋 {MARTIAL_ART_LABELS[belt.martial_art] || belt.martial_art}
                  </label>
                  <Select value={belt.belt_grade} onValueChange={(v) => onBeltChange(idx, v as BeltGrade)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BELT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma faixa registrada.</p>
            )}
            <p className="text-xs text-muted-foreground">Confirme a(s) faixa(s) do aluno antes de aprovar.</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={actionType === "approve" ? onApprove : onReject}
            className={actionType === "approve" ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
            disabled={actionLoading}
          >
            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {actionType === "approve" ? "Aprovar" : "Rejeitar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Scholarship Confirm Dialog ────────────────────────────
interface ScholarshipDialogProps {
  student: Profile | null;
  onClose: () => void;
  onKeep: () => void;
  onCancel: () => void;
}

export function ScholarshipDialog({ student, onClose, onKeep, onCancel }: ScholarshipDialogProps) {
  return (
    <AlertDialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar como bolsista</AlertDialogTitle>
          <AlertDialogDescription>
            {student?.name} possui mensalidades pendentes. Deseja cancelá-las ao marcá-lo como bolsista?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={onKeep}>Manter pendentes</Button>
          <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Cancelar pendentes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Edit Student Dialog ───────────────────────────────────
interface EditStudentDialogProps {
  student: Profile | null;
  editName: string;
  editPhone: string;
  editBelt: BeltGrade;
  editBirthDate: string;
  editStudentBelts: { martial_art: string; belt_grade: string; id?: string }[];
  editGuardianName: string;
  editGuardianPhone: string;
  editGuardianEmail: string;
  actionLoading: boolean;
  onClose: () => void;
  onSave: () => void;
  onDeleteBelt: (beltId: string, martialArt: string) => void;
  setEditName: (v: string) => void;
  setEditPhone: (v: string) => void;
  setEditBelt: (v: BeltGrade) => void;
  setEditBirthDate: (v: string) => void;
  setEditStudentBelts: React.Dispatch<React.SetStateAction<{ martial_art: string; belt_grade: string; id?: string }[]>>;
  setEditGuardianName: (v: string) => void;
  setEditGuardianPhone: (v: string) => void;
  setEditGuardianEmail: (v: string) => void;
}

export function EditStudentDialog({
  student, editName, editPhone, editBelt, editBirthDate, editStudentBelts,
  editGuardianName, editGuardianPhone, editGuardianEmail, actionLoading,
  onClose, onSave, onDeleteBelt,
  setEditName, setEditPhone, setEditBelt, setEditBirthDate, setEditStudentBelts,
  setEditGuardianName, setEditGuardianPhone, setEditGuardianEmail,
}: EditStudentDialogProps) {
  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Aluno</DialogTitle>
          <DialogDescription>Atualize as informações do aluno.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
          </div>
          {editStudentBelts.length > 0 ? (
            <div className="space-y-2">
              <Label>Faixas por Arte Marcial</Label>
              {editStudentBelts.map((belt, idx) => (
                <div key={belt.id || idx} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">
                    {belt.martial_art === "judo" ? "Judô" : belt.martial_art === "bjj" ? "Jiu-Jitsu" : belt.martial_art}
                  </span>
                  <Select
                    value={belt.belt_grade}
                    onValueChange={(v) => {
                      setEditStudentBelts(prev => prev.map((b, i) => i === idx ? { ...b, belt_grade: v } : b));
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BELT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => belt.id && onDeleteBelt(belt.id, belt.martial_art)}
                    title="Remover faixa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Faixa</Label>
              <Select value={editBelt} onValueChange={(v) => setEditBelt(v as BeltGrade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BELT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Dados do Responsável</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Responsável</Label>
                <Input value={editGuardianName} onChange={(e) => setEditGuardianName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone do Responsável</Label>
                <Input value={editGuardianPhone} onChange={(e) => setEditGuardianPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email do Responsável</Label>
                <Input type="email" value={editGuardianEmail} onChange={(e) => setEditGuardianEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={actionLoading}>
            {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Block Student Dialog ──────────────────────────────────
interface BlockDialogProps {
  student: Profile | null;
  blockReason: string;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  setBlockReason: (v: string) => void;
}

export function BlockStudentDialog({ student, blockReason, actionLoading, onClose, onConfirm, setBlockReason }: BlockDialogProps) {
  return (
    <AlertDialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {student?.is_blocked ? "Desbloquear Aluno" : "Bloquear Aluno"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {student?.is_blocked
              ? `Deseja desbloquear ${student?.name}? O aluno poderá acessar o sistema novamente.`
              : `Deseja bloquear ${student?.name}? O aluno não poderá acessar o sistema.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!student?.is_blocked && (
          <div className="space-y-2 py-2">
            <Label>Motivo do bloqueio (opcional)</Label>
            <Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ex: Inadimplência, indisciplina..." rows={2} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={actionLoading}
            className={student?.is_blocked ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
          >
            {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {student?.is_blocked ? "Desbloquear" : "Bloquear"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete/PermanentDelete Dialogs ────────────────────────
interface DeleteDialogProps {
  student: Profile | null;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  permanent?: boolean;
}

export function DeleteStudentDialog({ student, actionLoading, onClose, onConfirm, permanent }: DeleteDialogProps) {
  return (
    <AlertDialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{permanent ? "Excluir permanentemente?" : "Excluir Aluno"}</AlertDialogTitle>
          <AlertDialogDescription>
            {permanent
              ? <>Esta ação é irreversível. Todos os dados de <strong>{student?.name}</strong> serão removidos permanentemente, incluindo presenças, pagamentos, conquistas e XP.</>
              : `Tem certeza que deseja excluir ${student?.name} do sistema? O aluno será movido para a aba de rejeitados e perderá o acesso.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={actionLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {permanent ? "Excluir Permanentemente" : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Enrollment Dialog ─────────────────────────────────────
interface EnrollDialogProps {
  student: Profile | null;
  availableClasses: { id: string; name: string; martial_art: string }[];
  selectedClassIds: Set<string>;
  enrollLoading: boolean;
  onClose: () => void;
  onEnroll: () => void;
  setSelectedClassIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const MARTIAL_ART_CLASS_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

export function EnrollmentDialog({
  student, availableClasses, selectedClassIds, enrollLoading,
  onClose, onEnroll, setSelectedClassIds,
}: EnrollDialogProps) {
  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Matricular em Turma
          </DialogTitle>
          <DialogDescription>
            {student?.name} foi aprovado! Selecione as turmas para matriculá-lo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
          {availableClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma turma disponível.</p>
          ) : (
            availableClasses.map((cls) => (
              <label
                key={cls.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedClassIds.has(cls.id)}
                  onCheckedChange={(checked) => {
                    setSelectedClassIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(cls.id); else next.delete(cls.id);
                      return next;
                    });
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{cls.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {MARTIAL_ART_CLASS_LABELS[cls.martial_art] || cls.martial_art}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Pular</Button>
          <Button onClick={onEnroll} disabled={enrollLoading || selectedClassIds.size === 0}>
            {enrollLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Matricular ({selectedClassIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cross-Art Belt Dialog ─────────────────────────────────
interface CrossArtDialogProps {
  dialog: { student: Profile; missingArts: string[] } | null;
  crossArtBelts: Record<string, BeltGrade>;
  enrollLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  setCrossArtBelts: React.Dispatch<React.SetStateAction<Record<string, BeltGrade>>>;
}

export function CrossArtBeltDialog({ dialog, crossArtBelts, enrollLoading, onClose, onConfirm, setCrossArtBelts }: CrossArtDialogProps) {
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            Definir Faixa em Nova Arte
          </DialogTitle>
          <DialogDescription>
            {dialog?.student.name} será matriculado em uma turma de arte marcial diferente. Defina a faixa inicial.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {dialog?.missingArts.map((art) => (
            <div key={art} className="space-y-2">
              <Label className="text-sm font-medium">🥋 {MARTIAL_ART_LABELS[art] || art}</Label>
              <Select value={crossArtBelts[art] || "branca"} onValueChange={(v) => setCrossArtBelts(prev => ({ ...prev, [art]: v as BeltGrade }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BELT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <BeltBadge grade={value} size="sm" martialArt={art} />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={enrollLoading}>
            {enrollLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar e Matricular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ─────────────────────────────────
interface ResetPwDialogProps {
  student: Profile | null;
  newPassword: string;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  setNewPassword: (v: string) => void;
}

export function ResetPasswordDialog({ student, newPassword, actionLoading, onClose, onConfirm, setNewPassword }: ResetPwDialogProps) {
  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            Digite a nova senha para <strong>{student?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onConfirm(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={actionLoading || newPassword.trim().length < 6}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Guardian Info Dialog ──────────────────────────────────
interface GuardianInfoDialogProps {
  student: Profile | null;
  guardianProfile: Profile | null;
  guardianLoading: boolean;
  onClose: () => void;
}

export function GuardianInfoDialog({ student, guardianProfile, guardianLoading, onClose }: GuardianInfoDialogProps) {
  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Responsável de {student?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {guardianLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {student?.guardian_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{student.guardian_name}</span>
                </div>
              )}
              {student?.guardian_email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{student.guardian_email}</span>
                </div>
              )}
              {student?.guardian_phone && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="h-4 w-4 text-muted-foreground">📱</span>
                  <span>{student.guardian_phone}</span>
                </div>
              )}
              {guardianProfile && (
                <>
                  {!student?.guardian_name && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{guardianProfile.name}</span>
                    </div>
                  )}
                  {!student?.guardian_phone && guardianProfile.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="h-4 w-4 text-muted-foreground">📱</span>
                      <span>{guardianProfile.phone}</span>
                    </div>
                  )}
                  {!student?.guardian_email && guardianProfile.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{guardianProfile.email}</span>
                    </div>
                  )}
                </>
              )}
              {!guardianProfile && !student?.guardian_email && !student?.guardian_name && !student?.guardian_phone && (
                <p className="text-sm text-muted-foreground">Nenhum dado de responsável encontrado.</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

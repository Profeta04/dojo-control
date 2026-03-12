import { BeltBadge } from "@/components/shared/BeltBadge";
import { RegistrationStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Mail, UserCheck, UserX, Ban, Trash2, Edit, Unlock, Shield, GraduationCap, MoreHorizontal, KeyRound } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface StudentTableProps {
  data: Profile[];
  showActions?: boolean;
  showManage?: boolean;
  showPermanentDelete?: boolean;
  isMultiArt: boolean;
  getStudentBelt: (userId: string, martialArt: string) => string | null;
  getStudentPaymentStatus: (userId: string) => string | null;
  onApprove?: (student: Profile) => void;
  onReject?: (student: Profile) => void;
  onEdit?: (student: Profile) => void;
  onResetPassword?: (student: Profile) => void;
  onViewGuardian?: (student: Profile) => void;
  onBlock?: (student: Profile) => void;
  onDelete?: (student: Profile) => void;
  onPermanentDelete?: (student: Profile) => void;
  onToggleFederated?: (student: Profile) => void;
  onToggleScholarship?: (student: Profile) => void;
}

export function StudentTable({
  data,
  showActions = false,
  showManage = false,
  showPermanentDelete = false,
  isMultiArt,
  getStudentBelt,
  getStudentPaymentStatus,
  onApprove,
  onReject,
  onEdit,
  onResetPassword,
  onViewGuardian,
  onBlock,
  onDelete,
  onPermanentDelete,
  onToggleFederated,
  onToggleScholarship,
}: StudentTableProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            {isMultiArt ? (
              <>
                <TableHead>Judô</TableHead>
                <TableHead>BJJ</TableHead>
              </>
            ) : (
              <TableHead>Faixa</TableHead>
            )}
            <TableHead className="hidden md:table-cell">Federado</TableHead>
            <TableHead className="hidden md:table-cell">Bolsista</TableHead>
            <TableHead className="hidden sm:table-cell">Mensalidade</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            {(showActions || showManage || showPermanentDelete) && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((student) => (
            <TableRow key={student.user_id} className={student.is_blocked ? "opacity-60" : ""}>
              <TableCell>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{student.name}</p>
                    {student.is_blocked && (
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground sm:hidden">{student.email}</p>
                  <div className="sm:hidden mt-1">
                    <RegistrationStatusBadge status={student.registration_status || "pendente"} />
                  </div>
                  <div className="md:hidden flex items-center gap-3 mt-1.5">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={student.is_federated ?? false}
                        onCheckedChange={() => onToggleFederated?.(student)}
                        aria-label="Federado"
                        className="scale-75 origin-left"
                      />
                      {student.is_federated ? <Shield className="h-3 w-3 text-primary" /> : null}
                      Fed.
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={student.is_scholarship ?? false}
                        onCheckedChange={() => onToggleScholarship?.(student)}
                        aria-label="Bolsista"
                        className="scale-75 origin-left"
                      />
                      {student.is_scholarship ? <GraduationCap className="h-3 w-3 text-accent-foreground" /> : null}
                      Bolsa
                    </label>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{student.email}</span>
                </div>
              </TableCell>
              {isMultiArt ? (
                <>
                  <TableCell>
                    {getStudentBelt(student.user_id, "judo") ? (
                      <BeltBadge grade={getStudentBelt(student.user_id, "judo")!} size="sm" />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStudentBelt(student.user_id, "bjj") ? (
                      <BeltBadge grade={getStudentBelt(student.user_id, "bjj")!} size="sm" />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </>
              ) : (
                <TableCell>
                  {student.belt_grade ? (
                    <BeltBadge grade={student.belt_grade} size="sm" />
                  ) : (
                    <span className="text-muted-foreground text-sm">Branca</span>
                  )}
                </TableCell>
              )}
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={student.is_federated ?? false}
                    onCheckedChange={() => onToggleFederated?.(student)}
                    aria-label={`Marcar ${student.name} como federado`}
                  />
                  {student.is_federated && (
                    <Shield className="h-4 w-4 text-primary" />
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={student.is_scholarship ?? false}
                    onCheckedChange={() => onToggleScholarship?.(student)}
                    aria-label={`Marcar ${student.name} como bolsista`}
                  />
                  {student.is_scholarship && (
                    <Badge variant="outline" className="text-xs gap-1 border-accent text-accent-foreground">
                      <GraduationCap className="h-3 w-3" />
                      Bolsista
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {getStudentPaymentStatus(student.user_id) ? (
                  <PaymentStatusBadge status={getStudentPaymentStatus(student.user_id)!} />
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {student.is_blocked ? (
                  <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                ) : (
                  <RegistrationStatusBadge status={student.registration_status || "pendente"} />
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success hover:text-success/80 hover:bg-success/10 h-8 px-2 sm:px-3"
                      onClick={() => onApprove?.(student)}
                    >
                      <UserCheck className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Aprovar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 px-2 sm:px-3"
                      onClick={() => onReject?.(student)}
                    >
                      <UserX className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Rejeitar</span>
                    </Button>
                  </div>
                </TableCell>
              )}
              {showManage && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(student)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onResetPassword?.(student)}>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Redefinir senha
                      </DropdownMenuItem>
                      {(student.guardian_email || student.guardian_user_id || student.guardian_name || student.guardian_phone) && (
                        <DropdownMenuItem onClick={() => onViewGuardian?.(student)}>
                          <Users className="h-4 w-4 mr-2" />
                          Ver Responsável
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onBlock?.(student)}>
                        {student.is_blocked ? (
                          <><Unlock className="h-4 w-4 mr-2" />Desbloquear</>
                        ) : (
                          <><Ban className="h-4 w-4 mr-2" />Bloquear</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete?.(student)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir do sistema
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
              {showPermanentDelete && (
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => onPermanentDelete?.(student)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

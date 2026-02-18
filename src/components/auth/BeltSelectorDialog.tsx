import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { BeltGrade } from "@/lib/constants";

interface BeltOption {
  value: BeltGrade;
  label: string;
}

const JUDO_BELTS: BeltOption[] = [
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

const JIUJITSU_BELTS: BeltOption[] = [
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

interface BeltSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBelt: BeltGrade;
  onSelectBelt: (belt: BeltGrade) => void;
}

export function BeltSelectorDialog({
  open,
  onOpenChange,
  selectedBelt,
  onSelectBelt,
}: BeltSelectorDialogProps) {
  const [tempBelt, setTempBelt] = useState<BeltGrade>(selectedBelt);

  const handleConfirm = () => {
    onSelectBelt(tempBelt);
    onOpenChange(false);
  };

  const BeltColumn = ({ title, belts }: { title: string; belts: BeltOption[] }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground text-center pb-1 border-b border-border">
        {title}
      </h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
        {belts.map((belt) => (
          <button
            key={`${title}-${belt.value}`}
            type="button"
            onClick={() => setTempBelt(belt.value)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
              tempBelt === belt.value
                ? "bg-accent/15 ring-1 ring-accent text-foreground font-medium"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <BeltBadge grade={belt.value} size="sm" />
            <span>{belt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecione sua faixa atual</DialogTitle>
          <DialogDescription>
            Escolha a faixa que você possui atualmente
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <BeltColumn title="🥋 Judô" belts={JUDO_BELTS} />
          <BeltColumn title="🥋 Jiu-Jitsu" belts={JIUJITSU_BELTS} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
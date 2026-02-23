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
import { BeltGrade, BJJ_DEGREE_BELTS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  { value: "azul", label: "Azul" },
  { value: "roxa", label: "Roxa" },
  { value: "marrom", label: "Marrom" },
  { value: "preta_1dan", label: "Preta" },
];

interface BeltSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBelt: BeltGrade;
  onSelectBelt: (belt: BeltGrade, degree?: number, martialArt?: string) => void;
}

export function BeltSelectorDialog({
  open,
  onOpenChange,
  selectedBelt,
  onSelectBelt,
}: BeltSelectorDialogProps) {
  const [tempBelt, setTempBelt] = useState<BeltGrade>(selectedBelt);
  const [tempDegree, setTempDegree] = useState<number>(0);
  const [selectedArt, setSelectedArt] = useState<"judo" | "bjj">("judo");

  const handleConfirm = () => {
    const degree = selectedArt === "bjj" ? tempDegree : 0;
    onSelectBelt(tempBelt, degree, selectedArt);
    onOpenChange(false);
  };

  const handleBeltSelect = (belt: BeltGrade, art: "judo" | "bjj") => {
    setTempBelt(belt);
    setSelectedArt(art);
    if (art !== "bjj") setTempDegree(0);
  };

  const showDegreeSelector = selectedArt === "bjj" && BJJ_DEGREE_BELTS.includes(tempBelt);

  const BeltColumn = ({ title, belts, art }: { title: string; belts: BeltOption[]; art: "judo" | "bjj" }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground text-center pb-1 border-b border-border">
        {title}
      </h3>
      <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
        {belts.map((belt) => (
          <button
            key={`${title}-${belt.value}`}
            type="button"
            onClick={() => handleBeltSelect(belt.value, art)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
              tempBelt === belt.value && selectedArt === art
                ? "bg-accent/15 ring-1 ring-accent text-foreground font-medium"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <BeltBadge grade={belt.value} size="sm" martialArt={art} degree={tempBelt === belt.value && selectedArt === art ? tempDegree : 0} />
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
          <BeltColumn title="🥋 Judô" belts={JUDO_BELTS} art="judo" />
          <BeltColumn title="🥋 Jiu-Jitsu" belts={JIUJITSU_BELTS} art="bjj" />
        </div>

        {/* BJJ Degree selector */}
        {showDegreeSelector && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm">Grau (listras)</Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTempDegree(d)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 p-2 rounded-md border transition-colors",
                    tempDegree === d
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  <BeltBadge grade={tempBelt} size="sm" martialArt="bjj" degree={d} />
                  <span className="text-xs">{d}º</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

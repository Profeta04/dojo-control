import { useDojoContext } from "@/hooks/useDojoContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Building } from "lucide-react";

export function DojoSelector() {
  const { 
    currentDojoId, 
    setCurrentDojoId, 
    userDojos, 
    isLoadingDojos,
    filterByDojo,
    setFilterByDojo,
  } = useDojoContext();

  // Don't show if user has no dojos or only one dojo
  if (isLoadingDojos || userDojos.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center gap-2 flex-1">
        <Building className="h-4 w-4 text-muted-foreground" />
        <Select
          value={currentDojoId || "all"}
          onValueChange={(value) => setCurrentDojoId(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Selecione o dojo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os dojos</SelectItem>
            {userDojos.map((dojo) => (
              <SelectItem key={dojo.id} value={dojo.id}>
                {dojo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {currentDojoId && (
        <div className="flex items-center gap-2">
          <Switch
            id="filter-by-dojo"
            checked={filterByDojo}
            onCheckedChange={setFilterByDojo}
          />
          <Label htmlFor="filter-by-dojo" className="text-xs text-muted-foreground cursor-pointer">
            Filtrar dados
          </Label>
        </div>
      )}
    </div>
  );
}

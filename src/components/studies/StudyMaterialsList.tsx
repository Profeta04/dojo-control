import { useState, Fragment } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fixedMaterials, FixedStudyMaterial } from "@/data/fixedStudyContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BELT_SECTIONS, getBeltSectionKey } from "@/lib/beltOrder";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CollapsibleSection } from "./CollapsibleSection";

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection: line contains | and next line is separator
    if (line.includes("|") && i + 1 < lines.length && /^\|?[\s-:|]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse header
      const parseRow = (row: string) =>
        row.split("|").map(c => c.trim()).filter(c => c !== "");
      const headers = parseRow(tableLines[0]);
      const bodyRows = tableLines.slice(2).map(parseRow);

      elements.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-muted-foreground border-b border-border/50">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-semibold mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-2 mb-1">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith("- ")) {
      elements.push(<li key={i} className="ml-4 my-0.5">{renderInline(line.slice(2))}</li>);
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={i} className="ml-4 my-0.5 list-decimal">{renderInline(line.replace(/^\d+\.\s/, ""))}</li>);
    } else if (line.startsWith("> ")) {
      elements.push(<blockquote key={i} className="border-l-2 border-primary pl-3 italic my-2">{renderInline(line.slice(2))}</blockquote>);
    } else if (line.startsWith("⚠️")) {
      elements.push(<p key={i} className="bg-warning/10 text-warning p-2 rounded text-sm mt-2">{line}</p>);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-1">{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

export function StudyMaterialsList() {
  const { profile } = useAuth();
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const { data: dbMaterials = [] } = useQuery({
    queryKey: ["study-materials", profile?.dojo_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_materials")
        .select("*")
        .eq("martial_art", "judo")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  // Merge fixed + db materials
  const allMaterials = [
    ...fixedMaterials.map(m => ({ ...m, isFixed: true })),
    ...dbMaterials.map((m: any) => ({ ...m, isFixed: false })),
  ];

  const openMaterial = (material: any) => {
    if (material.type === "pdf" && material.file_url) {
      // Open PDF in new tab via signed URL
      supabase.storage
        .from("study-materials")
        .createSignedUrl(material.file_url, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
        });
    } else {
      setSelectedMaterial(material);
    }
  };

  // Group materials by belt section
  const grouped = BELT_SECTIONS.map((section) => ({
    ...section,
    items: allMaterials.filter(
      (m) => getBeltSectionKey(m.belt_level || "branca", m.title) === section.key
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {allMaterials.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma apostila disponível ainda.</p>
          </CardContent>
        </Card>
      )}

      {grouped.map((group) => (
        <CollapsibleSection key={group.key} label={group.label} count={group.items.length}>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((material) => (
              <Card
                key={material.id}
                className="cursor-pointer hover:shadow-md transition-all group border-l-4 border-l-primary/40"
                onClick={() => openMaterial(material)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold leading-tight">
                        {material.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {material.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {material.type === "pdf" ? "📄 PDF" : "📝 Texto"}
                    </Badge>
                    {material.isFixed && (
                      <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/15 border-0">
                        ✦ Oficial
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleSection>
      ))}

      {/* Dialog for embedded content */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/15 via-primary/8 to-transparent px-6 pt-6 pb-4 border-b border-border/50">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-bold leading-snug">
                    {selectedMaterial?.title}
                  </DialogTitle>
                  {selectedMaterial?.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {selectedMaterial.description}
                    </p>
                  )}
                </div>
              </div>
              {selectedMaterial?.isFixed && (
                <div className="mt-3">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <FileText className="h-3 w-3" /> Conteúdo Oficial
                  </Badge>
                </div>
              )}
            </DialogHeader>
          </div>
          {/* Content */}
          <ScrollArea className="max-h-[60vh] px-6 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-bold
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground
              prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground">
              <MarkdownRenderer content={selectedMaterial?.content || ""} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

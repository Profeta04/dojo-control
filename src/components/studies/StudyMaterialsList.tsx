import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fixedMaterials, FixedStudyMaterial } from "@/data/fixedStudyContent";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BookOpen, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

      <div className="grid gap-3 sm:grid-cols-2">
        {allMaterials.map((material) => (
          <Card
            key={material.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openMaterial(material)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {material.title}
                    </CardTitle>
                  </div>
                </div>
                <BeltBadge grade={material.belt_level as any} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {material.description}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {material.type === "pdf" ? "PDF" : "Texto"}
                </Badge>
                {material.isFixed && (
                  <Badge variant="secondary" className="text-[10px]">Oficial</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog for embedded content */}
      <Dialog open={!!selectedMaterial} onOpenChange={() => setSelectedMaterial(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedMaterial?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {selectedMaterial?.content?.split("\n").map((line: string, i: number) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
                if (line.startsWith("- ")) return <li key={i} className="ml-4">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
                if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-primary pl-3 italic my-2">{line.slice(2)}</blockquote>;
                if (line.startsWith("⚠️")) return <p key={i} className="bg-warning/10 text-warning p-2 rounded text-sm mt-2">{line}</p>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="my-1">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

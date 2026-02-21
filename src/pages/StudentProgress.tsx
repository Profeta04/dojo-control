import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function StudentProgress() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Progresso dos Alunos"
        description="Acompanhe o desempenho dos alunos nas tarefas"
      />
      <div className="mt-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Tarefas automáticas</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              As tarefas são atribuídas automaticamente aos alunos com base na sua faixa e turma. 
              Acompanhe o progresso individual na página de cada aluno.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

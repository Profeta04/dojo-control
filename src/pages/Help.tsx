import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { HelpTutorials } from "@/components/help/HelpTutorials";
import { HelpFAQ } from "@/components/help/HelpFAQ";
import { BugReportForm } from "@/components/help/BugReportForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, HelpCircle, Bug } from "lucide-react";

export default function Help() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Ajuda"
          description="Tutoriais, perguntas frequentes e suporte"
        />

        <Tabs defaultValue="tutorials" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="tutorials" className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Tutoriais
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2 text-sm">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="bug" className="flex items-center gap-2 text-sm">
              <Bug className="h-4 w-4" />
              Relatar Erro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="mt-6">
            <HelpTutorials />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <HelpFAQ />
          </TabsContent>

          <TabsContent value="bug" className="mt-6">
            <BugReportForm />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}

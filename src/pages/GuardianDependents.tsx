import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";

export default function GuardianDependents() {
  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Dependentes" 
          description="Gerencie as informações dos seus dependentes" 
        />
        <div className="mt-6">
          <GuardianDashboard />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

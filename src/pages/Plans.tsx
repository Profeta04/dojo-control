import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";

export default function Plans() {
  const navigate = useNavigate();
  const { isAdmin, isSensei, loading: authLoading } = useAuth();

  const canAccess = isAdmin || isSensei;

  if (!authLoading && !canAccess) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Planos & Assinatura"
          description="Gerencie o plano de assinatura do seu dojo"
        />
        <div className="mt-6">
          <SubscriptionPlans />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { AdminSubscriptionView } from "./AdminSubscriptionView";
import { SenseiSubscriptionView } from "./SenseiSubscriptionView";

export function SubscriptionPlans() {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminSubscriptionView />;
  }

  return <SenseiSubscriptionView />;
}

import SignupClient from "./SignupClient";
import { normalizePlan } from "@/lib/plans";

type SignupPageProps = {
  searchParams?: {
    plan?: string | string[];
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const selectedPlanParam =
    typeof searchParams?.plan === "string"
      ? searchParams.plan
      : Array.isArray(searchParams?.plan)
        ? searchParams.plan[0]
        : null;

  return (
    <SignupClient
      selectedPlan={normalizePlan(selectedPlanParam)}
      signupMode={selectedPlanParam ? "checkout" : "trial"}
    />
  );
}

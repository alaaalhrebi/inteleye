import SignupClient from "./SignupClient";
import { normalizePlan } from "@/lib/plans";

type SignupPageProps = {
  searchParams?: {
    plan?: string | string[];
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const requestedPlan =
    typeof searchParams?.plan === "string"
      ? searchParams.plan
      : Array.isArray(searchParams?.plan)
      ? searchParams.plan[0]
      : "basic";

  return <SignupClient selectedPlan={normalizePlan(requestedPlan)} />;
}

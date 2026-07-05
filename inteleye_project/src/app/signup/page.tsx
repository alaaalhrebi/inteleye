import SignupClient from "./SignupClient";

type SignupPageProps = {
  searchParams?: {
    plan?: string | string[];
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const plan =
    typeof searchParams?.plan === "string"
      ? searchParams.plan
      : Array.isArray(searchParams?.plan)
      ? searchParams.plan[0]
      : "basic";

  return <SignupClient selectedPlan={plan} />;
}

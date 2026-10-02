import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout/AuthShell";

export const metadata: Metadata = { title: "Join the community" };

export default function SignUpPage() {
  return (
    <AuthShell command="useradd --create-home operator">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/onboarding" />
    </AuthShell>
  );
}

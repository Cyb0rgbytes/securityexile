import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout/AuthShell";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell command="ssh operator@exile">
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/onboarding" />
    </AuthShell>
  );
}

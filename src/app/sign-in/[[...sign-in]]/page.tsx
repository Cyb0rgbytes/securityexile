import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout/AuthShell";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthShell command="ssh operator@exile">
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/onboarding"
        // An OAuth sign-in for an unknown account turns into a sign-up; that
        // must still land on onboarding, whatever redirect_url was passed.
        signUpForceRedirectUrl="/onboarding"
      />
    </AuthShell>
  );
}

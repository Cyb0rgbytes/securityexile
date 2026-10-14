import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout/AuthShell";
import { portalUrl, SIGN_IN_URL, usesAccountPortal } from "@/lib/auth/urls";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Production signs in on accounts.securityexile.com; old /sign-in links forward there.
  if (usesAccountPortal) redirect(portalUrl(SIGN_IN_URL, await searchParams));
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

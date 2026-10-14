import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/layout/AuthShell";
import { portalUrl, SIGN_UP_URL, usesAccountPortal } from "@/lib/auth/urls";

export const metadata: Metadata = { title: "Join the community" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Production signs up on accounts.securityexile.com; old /sign-up links forward there.
  if (usesAccountPortal) redirect(portalUrl(SIGN_UP_URL, await searchParams));
  return (
    <AuthShell command="useradd --create-home operator">
      {/* force: every new account claims a handle before anything else */}
      <SignUp signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
    </AuthShell>
  );
}

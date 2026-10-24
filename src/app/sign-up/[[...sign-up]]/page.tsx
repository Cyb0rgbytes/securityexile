import type { Metadata } from "next";
import Link from "next/link";
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
      <p className="mt-6 text-center text-sm text-fg-muted">
        By joining you agree to the{" "}
        <Link href="/terms" className="text-fg underline underline-offset-4 hover:text-green-bright">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-fg underline underline-offset-4 hover:text-green-bright">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}

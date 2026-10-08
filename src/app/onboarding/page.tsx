import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/auth/member";
import { handleSchema } from "@/lib/validation/handle";
import { AuthShell } from "@/components/layout/AuthShell";
import { HandleForm } from "./HandleForm";

export const metadata: Metadata = { title: "Claim your handle" };

export default async function OnboardingPage() {
  const member = await getMember();
  if (!member) redirect("/sign-in");
  if (member.handle) redirect(`/u/${member.handle}`);

  // Prefill from the display name when it already makes a valid handle.
  const candidate = member.displayName?.toLowerCase().replace(/\s+/g, "-");
  const suggestion = candidate && handleSchema.safeParse(candidate).success ? candidate : undefined;

  return (
    <AuthShell command="passwd --set-handle">
      <h1 className="mb-6 self-start font-display text-2xl font-semibold tracking-tight text-fg">Pick your handle</h1>
      <HandleForm suggestion={suggestion} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const metadata: Metadata = {
  title: "Responsible disclosure",
  description: "How to report security vulnerabilities in Security Exile.",
};

// TODO(phase 7): finalize contact address, PGP key, scope and safe-harbor wording.
export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        responsible disclosure
      </CursorHeading>
      <p className="mt-6 text-fg-muted">
        This platform is built for hackers, so we expect you to poke at it. If you find a
        vulnerability, please report it privately so we can fix it before it&apos;s abused.
      </p>

      <GlassPanel className="mt-8 space-y-4 p-6 text-sm leading-relaxed">
        <h2 className="font-mono text-cyan">in scope</h2>
        <ul className="list-inside list-disc text-fg-muted">
          <li>Authorization bypasses on teams, invites, war rooms and writeups</li>
          <li>XSS / HTML injection via markdown, profiles or comments</li>
          <li>Spoiler-lock bypasses that reveal writeups before an event ends</li>
          <li>Invite-code brute forcing or rate-limit bypasses</li>
        </ul>
        <h2 className="font-mono text-cyan">out of scope</h2>
        <ul className="list-inside list-disc text-fg-muted">
          <li>Denial of service and volumetric testing</li>
          <li>Social engineering of members or staff</li>
          <li>The hidden easter-egg flags. Those are meant to be found.</li>
        </ul>
        <h2 className="font-mono text-cyan">how to report</h2>
        <p className="text-fg-muted">
          See <a className="text-neon underline" href="/.well-known/security.txt">security.txt</a> for
          the current contact. Please give us reasonable time to fix the issue before disclosing it.
          We won&apos;t pursue action against good-faith research that follows this policy.
        </p>
      </GlassPanel>
    </article>
  );
}

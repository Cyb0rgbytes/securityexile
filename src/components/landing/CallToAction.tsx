import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";

export function CallToAction() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 text-center sm:px-6">
      <CursorHeading level={2} className="mx-auto">
        ready to go into exile?
      </CursorHeading>
      <p className="mx-auto mt-4 max-w-lg text-fg-muted">
        Sign in with Discord or GitHub, claim a handle, and start collecting flags.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <NeonButton href="/sign-in">./connect</NeonButton>
        <NeonButton href="/events" variant="ghost">
          ls events/
        </NeonButton>
      </div>
    </section>
  );
}

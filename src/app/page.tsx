import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { TerminalDemo } from "@/components/landing/TerminalDemo";
import { CallToAction } from "@/components/landing/CallToAction";
import { SignalDivider } from "@/components/fx/SignalDivider";

export default function Home() {
  return (
    <>
      <Hero />
      <SignalDivider className="mt-16" />
      <FeatureGrid />
      <SignalDivider className="mt-16" />
      <TerminalDemo />
      <CallToAction />
    </>
  );
}

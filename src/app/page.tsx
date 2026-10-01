import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { TerminalDemo } from "@/components/landing/TerminalDemo";
import { CallToAction } from "@/components/landing/CallToAction";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <TerminalDemo />
      <CallToAction />
    </>
  );
}

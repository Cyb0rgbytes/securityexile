import { SignalDivider } from "@/components/fx/SignalDivider";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { getDict, type Lang } from "@/lib/i18n";
import { CallToAction } from "./CallToAction";
import { FeatureGrid } from "./FeatureGrid";
import { Hero } from "./Hero";
import { NextEvent } from "./NextEvent";
import { TerminalDemo } from "./TerminalDemo";

/** The landing page in either language. lang/dir come from <html>; see src/app/layout.tsx. */
export function Landing({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <div>
      <div className="relative mx-auto max-w-6xl">
        <LanguageSwitch lang={lang} path={lang === "ar" ? "/ar" : "/"} className="absolute end-4 top-4 z-10 sm:end-6" />
      </div>
      <Hero t={t} />
      <NextEvent t={t} />
      <SignalDivider className="mt-16" />
      <FeatureGrid t={t} />
      <SignalDivider className="mt-16" />
      {/* The terminal demo is a command-line UI and stays left-to-right in both languages. */}
      <div dir="ltr">
        <TerminalDemo />
      </div>
      <CallToAction t={t} />
    </div>
  );
}

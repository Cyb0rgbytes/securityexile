import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { apexAlternates } from "@/lib/i18n";
import { LEGAL } from "@/lib/i18n/legal";

const doc = LEGAL.rules.ar;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: apexAlternates("ar", "/ar/rules"),
};

export default function RulesArPage() {
  return <LegalDocView doc={doc} lang="ar" path="/ar/rules" draft={false} />;
}

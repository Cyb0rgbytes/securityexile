import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { apexAlternates } from "@/lib/i18n";
import { LEGAL } from "@/lib/i18n/legal";

const doc = LEGAL.rules.en;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: apexAlternates("en", "/rules"),
};

export default function RulesPage() {
  return <LegalDocView doc={doc} lang="en" path="/rules" draft={false} />;
}

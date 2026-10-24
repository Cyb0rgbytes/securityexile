import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { LEGAL } from "@/lib/i18n/legal";

const doc = LEGAL.terms.en;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/terms", languages: { en: "/terms", ar: "/ar/terms" } },
};

export default function TermsPage() {
  return <LegalDocView doc={doc} lang="en" path="/terms" />;
}

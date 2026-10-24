import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { apexAlternates } from "@/lib/i18n";
import { LEGAL } from "@/lib/i18n/legal";

const doc = LEGAL.terms.ar;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: apexAlternates("ar", "/ar/terms"),
};

export default function TermsArPage() {
  return <LegalDocView doc={doc} lang="ar" path="/ar/terms" />;
}

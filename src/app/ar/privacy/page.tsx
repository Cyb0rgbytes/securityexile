import type { Metadata } from "next";
import { LegalDocView } from "@/components/legal/LegalDocView";
import { LEGAL } from "@/lib/i18n/legal";

const doc = LEGAL.privacy.ar;

export const metadata: Metadata = {
  title: doc.title,
  description: doc.description,
  alternates: { canonical: "/ar/privacy", languages: { en: "/privacy", ar: "/ar/privacy" } },
};

export default function PrivacyArPage() {
  return <LegalDocView doc={doc} lang="ar" path="/ar/privacy" />;
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Landing } from "@/components/landing/Landing";
import { apexAlternates } from "@/lib/i18n";
import { ar } from "@/lib/i18n/ar";

export const metadata: Metadata = {
  title: { absolute: ar.meta.title },
  description: ar.meta.description,
  alternates: apexAlternates("ar", "/ar"),
  openGraph: { locale: "ar_AE", title: ar.meta.title, description: ar.meta.description },
};

export default async function HomeAr() {
  await connection();
  return <Landing lang="ar" />;
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Landing } from "@/components/landing/Landing";
import { apexAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: apexAlternates("en", "/"),
};

export default async function Home() {
  // The next-event strip reads the board at request time.
  await connection();
  return <Landing lang="en" />;
}

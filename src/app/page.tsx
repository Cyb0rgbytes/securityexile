import type { Metadata } from "next";
import { connection } from "next/server";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  alternates: { languages: { en: "/", ar: "/ar" } },
};

export default async function Home() {
  // The next-event strip reads the board at request time.
  await connection();
  return <Landing lang="en" />;
}

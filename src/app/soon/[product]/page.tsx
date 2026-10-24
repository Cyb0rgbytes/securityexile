import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";
import { ar } from "@/lib/i18n/ar";
import { en } from "@/lib/i18n/en";
import { DISCORD_INVITE_URL } from "@/lib/links";
import { SITE_ORIGIN } from "@/lib/site/hosts";

/**
 * Holding pages for ctf.securityexile.com and labs.securityexile.com (Build Plan p1-01).
 * src/proxy.ts rewrites those hosts here until the real products launch on their own servers.
 */
type Product = "ctf" | "labs";
type Props = { params: Promise<{ product: string }> };

const isProduct = (p: string): p is Product => p === "ctf" || p === "labs";

export function generateStaticParams() {
  return [{ product: "ctf" }, { product: "labs" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await params;
  return { title: isProduct(product) ? en.soon[product].title : "Coming soon", robots: { index: false } };
}

export default async function SoonPage({ params }: Props) {
  const { product } = await params;
  if (!isProduct(product)) notFound();
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20 sm:px-6">
      <p className="font-mono text-sm text-green" dir="ltr">
        {product}.securityexile.com
      </p>
      <div lang="en" className="mt-4">
        <CursorHeading level={1} prompt="#">
          {en.soon[product].title}
        </CursorHeading>
        <p className="mt-4 text-lg text-fg-muted">{en.soon[product].body}</p>
      </div>
      <div lang="ar" dir="rtl" className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-3xl font-bold text-fg">{ar.soon[product].title}</h2>
        <p className="mt-4 text-lg text-fg-muted">{ar.soon[product].body}</p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <NeonButton href={DISCORD_INVITE_URL}>
          {en.soon.discord} · <span lang="ar">{ar.soon.discord}</span>
        </NeonButton>
        {/* Absolute: on ctf./labs. a relative "/" would loop back to this page. */}
        <NeonButton href={SITE_ORIGIN} variant="ghost">
          {en.soon.home}
        </NeonButton>
      </div>
    </section>
  );
}

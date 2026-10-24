import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Chakra_Petch, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, JetBrains_Mono, Shippori_Mincho } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/appearance";
import { getDict, type Lang } from "@/lib/i18n";
import { SIGN_IN_URL, SIGN_UP_URL, usesAccountPortal } from "@/lib/auth/urls";
import { APP_ORIGIN, SITE_ORIGIN } from "@/lib/site/hosts";
import { FxProvider } from "@/lib/fx/FxProvider";
import { fxInitScript } from "@/lib/fx/init-script";
import { ShinobiBackdrop } from "@/components/fx/ShinobiBackdrop";
import { CommandPalette } from "@/components/palette/CommandPalette";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Display face: squared, cut-corner letterforms that echo the blade notches.
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Kanji seals and marks only. Not preloaded: the browser fetches just the
// unicode-range slices for the few glyphs on the page.
const shippori = Shippori_Mincho({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  preload: false,
});

// Arabic pages only (landing, policies). Not preloaded so English pages never fetch it.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // Absolute OG/canonical URLs resolve against the app host, where the shared pages live.
  metadataBase: new URL(APP_ORIGIN),
  title: {
    default: "Security Exile — learn security by doing",
    template: "%s · Security Exile",
  },
  description:
    "A cybersecurity learning community: writeups, walkthroughs and research by members, skill tracking, study teams and practice events.",
};

export const viewport: Viewport = {
  themeColor: "#070a12",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  // Per-request CSP nonce from src/proxy.ts; the inline script below only runs with it.
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  // Also from src/proxy.ts. On Arabic pages lang/dir belong on <html>, so the shared header,
  // footer and the [lang="ar"] font rule cover the whole document, not just the page body.
  const lang: Lang = requestHeaders.get("x-lang") === "ar" ? "ar" : "en";
  return (
    <html
      lang={lang}
      dir={getDict(lang).dir}
      data-fx="full"
      suppressHydrationWarning
      className={`${mono.variable} ${plex.variable} ${chakra.variable} ${shippori.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-fx before first paint; see lib/fx/init-script.ts */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: fxInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* telemetry off: members' browsers shouldn't report to a third party, and CSP blocks it anyway */}
        {/* Account Portal in production: only our own hosts may be redirect targets after auth. */}
        <ClerkProvider
          nonce={nonce}
          appearance={clerkAppearance}
          signInUrl={SIGN_IN_URL}
          signUpUrl={SIGN_UP_URL}
          allowedRedirectOrigins={usesAccountPortal ? [APP_ORIGIN, SITE_ORIGIN] : undefined}
          telemetry={false}
        >
          <FxProvider>
            <SkipLink />
            <ShinobiBackdrop />
            <CommandPalette />
            <Header />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
            <div aria-hidden="true" className="grain" />
          </FxProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

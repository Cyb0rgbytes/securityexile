import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Chakra_Petch, IBM_Plex_Sans, JetBrains_Mono, Shippori_Mincho } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/appearance";
import { FxProvider } from "@/lib/fx/FxProvider";
import { fxInitScript } from "@/lib/fx/init-script";
import { ShinobiBackdrop } from "@/components/fx/ShinobiBackdrop";
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

export const metadata: Metadata = {
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
  // Per-request CSP nonce from src/proxy.ts; the inline script below only runs with it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-fx="full"
      suppressHydrationWarning
      className={`${mono.variable} ${plex.variable} ${chakra.variable} ${shippori.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-fx before first paint; see lib/fx/init-script.ts */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: fxInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* telemetry off: members' browsers shouldn't report to a third party, and CSP blocks it anyway */}
        <ClerkProvider nonce={nonce} appearance={clerkAppearance} signInUrl="/sign-in" signUpUrl="/sign-up" telemetry={false}>
          <FxProvider>
            <SkipLink />
            <ShinobiBackdrop />
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

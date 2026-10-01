import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { FxProvider } from "@/lib/fx/FxProvider";
import { fxInitScript } from "@/lib/fx/init-script";
import { BackgroundVideo } from "@/components/fx/BackgroundVideo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const grotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#05070a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-fx="full"
      suppressHydrationWarning
      className={`${mono.variable} ${grotesk.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-fx before first paint; see lib/fx/init-script.ts */}
        <script dangerouslySetInnerHTML={{ __html: fxInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <FxProvider>
          <SkipLink />
          <BackgroundVideo />
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <div aria-hidden="true" className="grain" />
        </FxProvider>
      </body>
    </html>
  );
}

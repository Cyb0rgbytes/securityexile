import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/** Clerk's hosted components, re-skinned with the Security Exile tokens. */
// No base theme needed: every colour Clerk derives its palette from is set here.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#22d3b4",
    colorPrimaryForeground: "#04060b",
    colorDanger: "#f2412e",
    colorSuccess: "#5ff5d8",
    colorBackground: "#0d1220",
    colorForeground: "#ebe6da",
    colorMuted: "#0a0e1a",
    colorMutedForeground: "#8f97ab",
    colorInput: "#070a12",
    colorInputForeground: "#ebe6da",
    colorBorder: "rgb(148 170 210 / 0.2)",
    colorRing: "#5ff5d8",
    colorNeutral: "#ebe6da",
    colorShadow: "rgb(0 0 0 / 0.6)",
    colorModalBackdrop: "rgb(4 6 11 / 0.8)",
    fontFamily: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontFamilyMono: "var(--font-jetbrains-mono), ui-monospace, monospace",
    borderRadius: "0.1875rem",
  },
};

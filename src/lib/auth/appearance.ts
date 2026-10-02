import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/** Clerk's hosted components, re-skinned with the Security Exile tokens. */
// No base theme needed: every colour Clerk derives its palette from is set here.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#00c46a",
    colorPrimaryForeground: "#030507",
    colorDanger: "#e8192c",
    colorSuccess: "#2bff9a",
    colorBackground: "#0a1210",
    colorForeground: "#f2efe9",
    colorMuted: "#08100d",
    colorMutedForeground: "#93a09b",
    colorInput: "#05070a",
    colorInputForeground: "#f2efe9",
    colorBorder: "rgb(0 196 106 / 0.22)",
    colorRing: "#2bff9a",
    colorNeutral: "#f2efe9",
    colorShadow: "rgb(0 0 0 / 0.6)",
    colorModalBackdrop: "rgb(3 5 7 / 0.8)",
    fontFamily: "var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontFamilyMono: "var(--font-jetbrains-mono), ui-monospace, monospace",
    borderRadius: "0.375rem",
  },
};

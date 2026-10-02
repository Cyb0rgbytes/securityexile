import { z } from "zod";
import { JOIN_MODES } from "@/lib/db/enums";
import { ASSIGNABLE_ROLES } from "./permissions";

export const FOCUS_CATEGORIES = [
  "web", "pwn", "rev", "crypto", "forensics", "osint", "misc", "hardware", "cloud", "ai",
] as const;

export const EMBLEMS = ["falcon", "owl", "wolf", "serpent", "raven", "lynx", "scorpion", "kraken"] as const;
export type Emblem = (typeof EMBLEMS)[number];

export const emblemKey = (e: Emblem) => `emblem:${e}` as const;
export function emblemFromKey(key: string | null | undefined): Emblem {
  const slug = key?.startsWith("emblem:") ? key.slice(7) : "";
  return (EMBLEMS as readonly string[]).includes(slug) ? (slug as Emblem) : "falcon";
}

export const teamNameSchema = z
  .string()
  .trim()
  .overwrite((s) => s.replace(/\s+/g, " "))
  .min(3, "At least 3 characters.")
  .max(32, "At most 32 characters.")
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u, "Letters, numbers, spaces and . _ - only; start with a letter or number.");

export const teamTagSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,5}$/, "2–5 letters or numbers.");

export const bioSchema = z.string().trim().max(280, "At most 280 characters.").optional().default("");

/** FormData sends repeated checkbox values; dedupe and keep only known categories. */
export const focusSchema = z
  .array(z.enum(FOCUS_CATEGORIES))
  .max(FOCUS_CATEGORIES.length)
  .transform((a) => [...new Set(a)]);

export const createTeamSchema = z.object({
  name: teamNameSchema,
  tag: teamTagSchema,
  bio: bioSchema,
  focus: focusSchema,
  joinMode: z.enum(JOIN_MODES),
  emblem: z.enum(EMBLEMS),
});

export const updateIdentitySchema = createTeamSchema.pick({ name: true, tag: true, joinMode: true, emblem: true });
export const updateProfileSchema = createTeamSchema.pick({ bio: true, focus: true });

export const EXPIRY_OPTIONS = { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000, never: null } as const;

export const createInviteSchema = z.object({
  kind: z.enum(["private", "public"]),
  expiry: z.enum(Object.keys(EXPIRY_OPTIONS) as [keyof typeof EXPIRY_OPTIONS, ...(keyof typeof EXPIRY_OPTIONS)[]]),
  maxUses: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(1000)])
    .transform((v) => (v === "" ? null : v)),
});

export const joinRequestSchema = z.object({
  message: z.string().trim().max(280, "At most 280 characters.").optional().default(""),
});

export const setRoleSchema = z.object({ role: z.enum(ASSIGNABLE_ROLES) });

/** Teams are addressed by tag in URLs (/teams/ABC). */
export const tagParamSchema = teamTagSchema;

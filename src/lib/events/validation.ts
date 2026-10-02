import { z } from "zod";
import { EVENT_KINDS } from "@/lib/db/enums";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { MAX_EVENT_MS } from "./timing";

export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "event";
}

/** Browser sends `new Date(localValue).toISOString()`; require an explicit zone so the server never guesses. */
export function parseInstant(v: unknown): Date | null {
  if (typeof v !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const httpUrl = z.url({ protocol: /^https?$/, message: "Use a link starting with http:// or https://." }).max(500);

export function parseLinks(text: string): { label: string; url: string }[] | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 10) return { error: "At most 10 links." };
  const out: { label: string; url: string }[] = [];
  for (const line of lines) {
    const [label, raw] = line.includes("|") ? line.split("|", 2).map((s) => s.trim()) : [null, line];
    const url = httpUrl.safeParse(raw);
    if (!url.success) return { error: `Not a valid http(s) link: ${raw.slice(0, 60)}` };
    out.push({ label: (label || new URL(url.data).host).slice(0, 40), url: url.data });
  }
  return out;
}

const instant = z.unknown().transform((v, ctx) => {
  const d = parseInstant(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Pick a valid date and time." });
    return z.NEVER;
  }
  return d;
});

export const eventInputSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(80, "Title is at most 80 characters."),
  kind: z.enum(EVENT_KINDS),
  format: z.string().trim().max(30, "Format is at most 30 characters.").optional().default(""),
  url: z.union([z.literal(""), httpUrl]).optional().default(""),
  description: z.string().trim().max(2000, "Description is at most 2000 characters.").optional().default(""),
  startsAt: instant,
  endsAt: instant,
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Returns an error message, or null when the window is acceptable. */
export function validateWindow(startsAt: Date, endsAt: Date, now: number, isNew: boolean): string | null {
  if (endsAt.getTime() <= startsAt.getTime()) return "The end time must be after the start time.";
  if (isNew && startsAt.getTime() <= now) return "New events must start in the future.";
  if (endsAt.getTime() - startsAt.getTime() > MAX_EVENT_MS) return "Events can last at most 14 days.";
  return null;
}

export const challengeInputSchema = z.object({
  name: z.string().trim().min(1, "Give the challenge a name.").max(60, "Name is at most 60 characters."),
  category: z.enum(FOCUS_CATEGORIES),
  points: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0 || n > 10_000) {
        ctx.addIssue({ code: "custom", message: "Points must be a whole number from 0 to 10000." });
        return z.NEVER;
      }
      return n;
    }),
});

export const challengeNotesSchema = z.string().max(10_000, "Notes are at most 10000 characters.");
export const teamNotesSchema = z.string().max(20_000, "Notes are at most 20000 characters.");
export const slugParamSchema = z.string().regex(/^[a-z0-9-]{1,70}$/);

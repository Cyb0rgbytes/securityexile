import { z } from "zod";
import { DIFFICULTIES } from "@/lib/db/enums";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";

export const idSchema = z.string().regex(/^[0-9A-Z]{26}$/);
const TAG = /^[a-z0-9-]{2,24}$/;

export function parseTags(raw: string): string[] | { error: string } {
  const tags = [...new Set(raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 5) return { error: "At most 5 tags." };
  const bad = tags.find((t) => !TAG.test(t));
  if (bad) return { error: `Tags use 2–24 lowercase letters, digits or dashes: "${bad.slice(0, 30)}"` };
  return tags;
}

const optionalId = z.union([z.literal(""), idSchema]);

export const writeupInputSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(120, "Title is at most 120 characters."),
  bodyMd: z.string().max(100_000, "The writeup is over 100 000 characters."),
  category: z.union([z.literal(""), z.enum(FOCUS_CATEGORIES)]),
  difficulty: z.union([z.literal(""), z.enum(DIFFICULTIES)]),
  tags: z.array(z.string()).max(5),
  eventId: optionalId,
  seriesId: optionalId,
  seriesTitle: z.string().trim().max(80, "Series title is at most 80 characters."),
  seriesOrder: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1 || n > 999) {
        ctx.addIssue({ code: "custom", message: "Series position must be 1–999." });
        return z.NEVER;
      }
      return n;
    }),
  asTeam: z.string().transform((s) => s === "on"),
});
export type WriteupInput = z.infer<typeof writeupInputSchema>;

export const commentInputSchema = z.object({
  bodyMd: z.string().trim().min(1, "Write something first.").max(5_000, "Comments are at most 5000 characters."),
});

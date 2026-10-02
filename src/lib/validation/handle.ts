import { z } from "zod";

/**
 * Handles appear in URLs (/u/<handle>) and in the terminal palette, so they
 * must never collide with routes or commands, and must read unambiguously.
 */
export const RESERVED_HANDLES = new Set([
  // routes
  "admin", "api", "assets", "events", "leaderboard", "me", "onboarding", "security",
  "settings", "sign-in", "sign-up", "teams", "u", "writeups", "war-room",
  // identities people could impersonate
  "exile", "mod", "moderator", "official", "root", "security-exile", "staff", "support", "system",
  // palette commands
  "cd", "help", "join", "ls", "search", "sudo", "whoami",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters.")
  .max(20, "At most 20 characters.")
  .regex(/^[a-z][a-z0-9_-]*$/, "Start with a letter; then use letters, numbers, - or _.")
  .refine((h) => !/[-_]{2}/.test(h), "No double - or _.")
  .refine((h) => !/[-_]$/.test(h), "Can't end with - or _.")
  .refine((h) => !RESERVED_HANDLES.has(h), "That handle is reserved.");

export type Handle = z.infer<typeof handleSchema>;

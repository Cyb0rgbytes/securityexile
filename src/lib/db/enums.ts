// Enum values shared by the schema (server) and forms (client). No imports,
// so client components can use these without pulling Drizzle into the bundle.

export const RANK_TIERS = ["initiate", "operator", "specialist", "elite", "legend"] as const;
export const JOIN_MODES = ["open", "invite", "closed"] as const;
export const TEAM_ROLES = ["captain", "co_captain", "member", "reserve"] as const;
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export const CHALLENGE_STATUSES = ["open", "claimed", "solving", "solved"] as const;
export const DIFFICULTIES = ["beginner", "easy", "medium", "hard", "insane"] as const;
export const EVENT_KINDS = ["ctf", "community"] as const;
export const PLATFORM_ROLES = ["member", "moderator", "admin"] as const;

import { ulid } from "ulid";

/** Time-sortable, URL-safe primary key (26 chars). */
export const newId = (): string => ulid();

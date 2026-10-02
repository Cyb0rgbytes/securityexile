import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Events" };

// TODO(phase 4): replace with the events board.
export default function EventsPage() {
  return (
    <ComingSoon
      title="events"
      dir="events"
      lines={[
        "A board of upcoming CTFs and community events",
        "Team rosters for each event",
        "A private war room for your team during an event",
      ]}
    />
  );
}

import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Ranks" };

// TODO(phase 6): replace with the XP leaderboard.
export default function LeaderboardPage() {
  return (
    <ComingSoon
      title="ranks"
      dir="ranks"
      lines={[
        "Member and team leaderboards, ranked by XP",
        "XP for publishing writeups and taking part in events",
        "Rank tiers from initiate upward",
      ]}
    />
  );
}

import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Writeups" };

// TODO(phase 5): replace with the writeups library.
export default function WriteupsPage() {
  return (
    <ComingSoon
      title="writeups"
      dir="writeups"
      lines={[
        "Writeups, walkthroughs and research from the community",
        "Filter by topic and level, from beginner to advanced",
        "Event writeups stay spoiler-locked until the event ends",
      ]}
    />
  );
}

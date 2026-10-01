import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Phase 1: default (no incremental cache override). An R2-backed ISR cache
// gets wired in once the R2 bucket exists (Phase 2+, needs approval).
export default defineCloudflareConfig({});

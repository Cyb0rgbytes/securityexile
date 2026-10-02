"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const ghost =
  "whitespace-nowrap rounded border border-line-strong px-3 py-1 font-mono text-xs text-fg transition-colors hover:border-green-bright hover:text-green-bright";
const solid =
  "whitespace-nowrap rounded bg-green px-3 py-1 font-mono text-xs font-semibold text-bg-deep transition-colors hover:bg-green-bright";

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        {/* Redirect mode keeps the branded /sign-in and /sign-up pages instead of a modal. */}
        <SignInButton mode="redirect">
          <button type="button" className={ghost}>
            sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <button type="button" className={`${solid} hidden sm:inline-block`}>
            join
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}

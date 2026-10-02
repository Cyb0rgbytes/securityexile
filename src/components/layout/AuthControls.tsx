"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const ghost =
  "whitespace-nowrap rounded border border-line-strong px-3 py-1 font-mono text-xs text-fg transition-colors hover:border-green-bright hover:text-green-bright";
const solid =
  "whitespace-nowrap rounded bg-green px-3 py-1 font-mono text-xs font-semibold text-bg-deep transition-colors hover:bg-green-bright";

function DossierIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1" />
      <path d="M5 5h6M5 8h6M5 11h3" />
    </svg>
  );
}

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        {/* Redirect mode keeps the branded /sign-in and /sign-up pages instead of a modal.
            New accounts are forced through onboarding even though these buttons pass
            the current page as redirect_url. */}
        <SignInButton mode="redirect" signUpForceRedirectUrl="/onboarding">
          <button type="button" className={ghost}>
            sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect" forceRedirectUrl="/onboarding">
          <button type="button" className={`${solid} hidden sm:inline-block`}>
            join
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link label="Your dossier" labelIcon={<DossierIcon />} href="/u/me" />
            <UserButton.Link label="My writeups" labelIcon={<DossierIcon />} href="/me/writeups" />
            <UserButton.Link label="Bookmarks" labelIcon={<DossierIcon />} href="/me/bookmarks" />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </>
  );
}

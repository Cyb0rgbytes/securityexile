"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const ghost =
  "notch notch-sm whitespace-nowrap px-3 py-1.5 font-display text-xs font-semibold text-fg shadow-[inset_0_0_0_1px_var(--se-line-strong)] transition-[color,box-shadow] hover:text-green-bright hover:shadow-[inset_0_0_0_1px_var(--se-green-bright)]";
const solid =
  "notch notch-sm glint whitespace-nowrap bg-green px-3 py-1.5 font-display text-xs font-semibold text-bg-deep transition-colors hover:bg-green-bright";

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

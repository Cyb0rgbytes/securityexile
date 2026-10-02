"use client";

import { useActionState, useState } from "react";
import {
  createInvite,
  decideRequest,
  kickMember,
  revokeInvite,
  setRole,
  transferCaptaincy,
  updateIdentity,
  updateProfile,
  type ActionState,
} from "../../actions";
import { IdentityFields, ProfileFields } from "@/components/teams/TeamFields";
import { FormMessage, inputCls, labelCls, SubmitButton } from "@/components/teams/FormBits";
import { RoleChip } from "@/components/teams/RoleChip";
import { can, type TeamRole } from "@/lib/teams/permissions";
import type { Emblem } from "@/lib/teams/validation";

// ---------------------------------------------------------------- profile

export function IdentityPanel(props: { tag: string; name: string; joinMode: "open" | "invite" | "closed"; emblem: Emblem }) {
  const [state, action] = useActionState<ActionState, FormData>(updateIdentity.bind(null, props.tag), {});
  return (
    <form action={action} className="space-y-6">
      <IdentityFields defaults={props} />
      <FormMessage state={state} />
      <SubmitButton pending="saving…">save identity</SubmitButton>
    </form>
  );
}

export function ProfilePanel(props: { tag: string; bio: string | null; focus: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile.bind(null, props.tag), {});
  return (
    <form action={action} className="space-y-6">
      <ProfileFields defaults={props} />
      <FormMessage state={state} />
      <SubmitButton pending="saving…">save profile</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------- invites

export function CreateInvitePanel({ tag }: { tag: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createInvite.bind(null, tag), {});
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[auto_auto_8rem_auto] sm:items-end">
        <div>
          <label htmlFor="kind" className={labelCls}>
            Type
          </label>
          <select id="kind" name="kind" className={`${inputCls} mt-1`} defaultValue="private">
            <option value="private">private (shown once)</option>
            <option value="public">public (visible to members)</option>
          </select>
        </div>
        <div>
          <label htmlFor="expiry" className={labelCls}>
            Expires
          </label>
          <select id="expiry" name="expiry" className={`${inputCls} mt-1`} defaultValue="7d">
            <option value="1h">in 1 hour</option>
            <option value="24h">in 24 hours</option>
            <option value="7d">in 7 days</option>
            <option value="30d">in 30 days</option>
            <option value="never">never</option>
          </select>
        </div>
        <div>
          <label htmlFor="maxUses" className={labelCls}>
            Max uses
          </label>
          <input id="maxUses" name="maxUses" type="number" min={1} max={1000} placeholder="∞" className={`${inputCls} mt-1`} />
        </div>
        <SubmitButton pending="generating…">new code</SubmitButton>
      </form>
      <FormMessage state={state} />
      {state.code && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-green/50 bg-green/5 p-4">
          <code className="select-all font-mono text-xl tracking-wider text-green-bright">{state.code}</code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.code!);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded border border-line-strong px-3 py-1 font-mono text-xs text-fg hover:border-green-bright hover:text-green-bright"
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>
      )}
    </div>
  );
}

export function RevokeButton({ tag, inviteId }: { tag: string; inviteId: string }) {
  return (
    <form action={revokeInvite.bind(null, tag, inviteId)}>
      <button type="submit" className="font-mono text-xs text-fg-muted hover:text-red-bright">
        revoke
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- requests

export function RequestDecision({ tag, requestId }: { tag: string; requestId: string }) {
  const [msg, setMsg] = useState<ActionState>({});
  const [busy, setBusy] = useState(false);
  const decide = async (d: "approve" | "reject") => {
    setBusy(true);
    setMsg(await decideRequest(tag, requestId, d));
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={() => decide("approve")} className="rounded bg-green px-3 py-1 font-mono text-xs font-semibold text-bg-deep hover:bg-green-bright disabled:opacity-60">
        approve
      </button>
      <button type="button" disabled={busy} onClick={() => decide("reject")} className="rounded border border-line-strong px-3 py-1 font-mono text-xs text-fg hover:border-red hover:text-red-bright disabled:opacity-60">
        reject
      </button>
      <FormMessage state={msg} />
    </div>
  );
}

// ---------------------------------------------------------------- members

export function MemberControls(props: { tag: string; userId: string; handle: string; role: TeamRole; actorRole: TeamRole; isSelf: boolean }) {
  const { tag, userId, handle, role, actorRole, isSelf } = props;
  const [mode, setMode] = useState<"idle" | "kick" | "transfer">("idle");
  const [roleState, roleAction] = useActionState<ActionState, FormData>(setRole.bind(null, tag, userId), {});
  const [kickState, kickAction] = useActionState<ActionState, FormData>(kickMember.bind(null, tag, userId), {});
  const [xferState, xferAction] = useActionState<ActionState, FormData>(transferCaptaincy.bind(null, tag, userId), {});

  if (isSelf) return <RoleChip role={role} />;

  const canRole = can(actorRole, "member.set_role", role);
  const canKick = can(actorRole, "member.kick", role);
  const canXfer = can(actorRole, "captain.transfer", role);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canRole ? (
          // key={role}: React resets a form after its action runs; remounting on
          // a role change makes the select show the saved role, not the old one.
          <form key={role} action={roleAction} className="flex items-center gap-2">
            <label htmlFor={`role-${userId}`} className="sr-only">
              Role for @{handle}
            </label>
            <select id={`role-${userId}`} name="role" defaultValue={role} className="rounded border border-line-strong bg-bg-deep px-2 py-1 font-mono text-xs text-fg">
              <option value="co_captain">co-captain</option>
              <option value="member">member</option>
              <option value="reserve">reserve</option>
            </select>
            <SubmitButton variant="ghost" className="!px-2 !py-1 !text-xs" pending="…">
              set
            </SubmitButton>
          </form>
        ) : (
          <RoleChip role={role} />
        )}
        {canXfer && (
          <button type="button" onClick={() => setMode(mode === "transfer" ? "idle" : "transfer")} className="font-mono text-xs text-fg-muted hover:text-green-bright">
            make captain
          </button>
        )}
        {canKick && (
          <button type="button" onClick={() => setMode(mode === "kick" ? "idle" : "kick")} className="font-mono text-xs text-fg-muted hover:text-red-bright">
            remove
          </button>
        )}
      </div>
      <FormMessage state={roleState} />

      {mode !== "idle" && (
        <form action={mode === "kick" ? kickAction : xferAction} className="w-full max-w-xs space-y-2 rounded border border-red/40 p-3 text-left">
          <p className="text-xs text-fg">
            {mode === "kick" ? `Remove @${handle} from the team?` : `Hand captaincy to @${handle}? You'll become a co-captain.`}
          </p>
          <label htmlFor={`confirm-${mode}-${userId}`} className="block text-xs text-fg-muted">
            Type <span className="font-mono text-fg">{handle}</span> to confirm
          </label>
          <input id={`confirm-${mode}-${userId}`} name="confirm" autoComplete="off" className={inputCls} />
          <FormMessage state={mode === "kick" ? kickState : xferState} />
          <SubmitButton variant="danger" pending="…" className="!py-1 !text-xs">
            {mode === "kick" ? "remove" : "transfer"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

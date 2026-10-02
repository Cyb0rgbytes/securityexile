"use client";

import { useActionState } from "react";
import { createTeam, type ActionState } from "../actions";
import { IdentityFields, ProfileFields } from "@/components/teams/TeamFields";
import { FormMessage, SubmitButton } from "@/components/teams/FormBits";

export function CreateTeamForm() {
  const [state, action] = useActionState<ActionState, FormData>(createTeam, {});
  return (
    <form action={action} className="glass bracketed space-y-6 p-6">
      <IdentityFields defaults={{ name: state.fields?.name, tag: state.fields?.tag }} />
      <ProfileFields defaults={{ bio: state.fields?.bio }} />
      <FormMessage state={state} />
      <SubmitButton pending="creating…">create team</SubmitButton>
    </form>
  );
}

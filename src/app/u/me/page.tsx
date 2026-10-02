import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";

// /u/me → your own dossier. requireMember() sends signed-out visitors to
// sign-in and members without a handle to onboarding, so nobody is stranded.
// ("me" is a reserved handle, so it can't collide with a real profile.)
export default async function MyDossier(): Promise<never> {
  const member = await requireMember();
  redirect(`/u/${member.handle}`);
}

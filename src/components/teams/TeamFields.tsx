import { EMBLEMS, FOCUS_CATEGORIES, type Emblem } from "@/lib/teams/validation";
import { JOIN_MODE_LABEL } from "./RoleChip";
import { EmblemBadge } from "./EmblemBadge";
import { inputCls, labelCls } from "./FormBits";

/** Name / tag / join mode / emblem inputs, shared by create and edit. */
export function IdentityFields({
  defaults,
}: {
  defaults?: { name?: string; tag?: string; joinMode?: keyof typeof JOIN_MODE_LABEL; emblem?: Emblem };
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <div>
          <label htmlFor="name" className={labelCls}>
            Team name
          </label>
          <input id="name" name="name" required minLength={3} maxLength={32} defaultValue={defaults?.name} className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label htmlFor="tag" className={labelCls}>
            Tag
          </label>
          <input
            id="tag"
            name="tag"
            required
            minLength={2}
            maxLength={5}
            pattern="[A-Za-z0-9]{2,5}"
            defaultValue={defaults?.tag}
            autoCapitalize="characters"
            className={`${inputCls} mt-1 uppercase`}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>Who can join</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(JOIN_MODE_LABEL) as (keyof typeof JOIN_MODE_LABEL)[]).map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name="joinMode" value={m} defaultChecked={(defaults?.joinMode ?? "invite") === m} className="peer sr-only" />
              <span className="inline-block rounded border border-line-strong px-3 py-1.5 font-mono text-xs text-fg-muted peer-checked:border-green-bright peer-checked:text-green-bright peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-green-bright">
                {JOIN_MODE_LABEL[m]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Emblem</legend>
        <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {EMBLEMS.map((e) => (
            <label key={e} className="cursor-pointer text-center">
              <input type="radio" name="emblem" value={e} defaultChecked={(defaults?.emblem ?? "falcon") === e} className="peer sr-only" />
              <span className="block rounded-full p-0.5 ring-2 ring-transparent peer-checked:ring-green-bright peer-focus-visible:ring-green">
                <EmblemBadge emblem={e} size={56} className="mx-auto" />
              </span>
              <span className="mt-1 block font-mono text-[0.65rem] text-fg-muted">{e}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

/** Bio + focus inputs, shared by create and edit. */
export function ProfileFields({ defaults }: { defaults?: { bio?: string | null; focus?: readonly string[] } }) {
  return (
    <>
      <div>
        <label htmlFor="bio" className={labelCls}>
          Bio <span className="text-fg-muted/70">(optional, 280 characters)</span>
        </label>
        <textarea id="bio" name="bio" rows={3} maxLength={280} defaultValue={defaults?.bio ?? ""} className={`${inputCls} mt-1 font-sans`} />
      </div>
      <fieldset>
        <legend className={labelCls}>Focus areas</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FOCUS_CATEGORIES.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="checkbox" name="focus" value={c} defaultChecked={defaults?.focus?.includes(c)} className="peer sr-only" />
              <span className="inline-block rounded border border-line px-2.5 py-1 font-mono text-xs text-fg-muted peer-checked:border-green peer-checked:bg-green/10 peer-checked:text-green-bright peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-green-bright">
                {c}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

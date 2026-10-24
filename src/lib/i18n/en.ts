/** English copy for the bilingual pages (landing, policies, holding pages). ar.ts mirrors this shape. */
export const en = {
  lang: "en",
  dir: "ltr",
  meta: {
    title: "Security Exile — learn security by doing",
    description:
      "A cybersecurity learning community: writeups, walkthroughs and research by members, skill tracking, study teams and practice events.",
  },
  switchTo: { label: "العربية", href: "/ar", hrefLang: "ar" },
  hero: {
    headline: ["Learn security", "by doing."],
    tagline: "Write it up. Level up.",
    body: "A knowledge base written by its members: walkthroughs, research notes and writeups, from first steps to advanced tradecraft. Track your skills, form study teams, and practise together in CTFs when you want to.",
    browse: "Browse writeups",
    join: "Join the community",
  },
  nextEvent: {
    label: "Next event",
    live: "Live now",
    startsIn: "starts in",
    endsIn: "ends in",
    view: "Event details",
    none: "The next event is announced on Discord first.",
    noneCta: "Join the Discord",
  },
  features: {
    heading: "What's inside",
    lead: {
      title: "Writeups and walkthroughs",
      body: "Markdown with terminal output blocks and syntax highlighting. Group posts into series. Writeups tied to a live event stay hidden until it ends.",
      link: "Open the library",
    },
    items: [
      { title: "Skill dossier", body: "A profile that shows what you can do: a skill radar, badges, rank, and everything you've published." },
      { title: "Study teams", body: "Form a team with people at your level or ahead of it. Captains, co-captains and reserves; open, invite-only or closed." },
      { title: "Practice events", body: "A board of upcoming CTFs. Register your team and get a private war room to claim challenges, track solves and share notes." },
      { title: "Invite codes", body: "Bring people in with codes that expire, cap their uses and can be revoked. Every redemption is logged." },
      { title: "Terminal palette", body: "Press Ctrl+K to navigate with cd, ls, search and join. A few commands aren't documented. Look around." },
    ],
  },
  cta: {
    headline: ["Start learning.", "Then teach someone."],
    body: "Sign in with Discord or GitHub, claim a handle, and your dossier starts filling in.",
    create: "Create account",
    read: "Read a writeup",
    discord: "Join the Discord",
    crestAlt: "Security Exile crest: a falcon with a fingerprint in the colours of the UAE flag",
  },
  footer: {
    tagline: "Hack the planet, responsibly.",
    terms: "Terms",
    privacy: "Privacy",
    disclosure: "Responsible disclosure",
  },
  legal: {
    updated: "Last updated",
    review: "Draft pending legal review. The rules already apply.",
    contents: "Contents",
    agree: "By joining you agree to the",
    and: "and",
  },
  soon: {
    ctf: {
      title: "The CTF arena is being built",
      body: "ctf.securityexile.com will host Security Exile's own competitions: jeopardy events, blue-team challenges and seasons. Join the Discord to hear when event #1 opens.",
    },
    labs: {
      title: "Labs are coming later",
      body: "labs.securityexile.com will host isolated, browser-based hands-on labs, from web basics to a SOC analyst path. Join the Discord to follow the build.",
    },
    home: "Back to Security Exile",
    discord: "Join the Discord",
  },
};

/** Same keys, any string values: what every other language must provide. */
type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof en>;

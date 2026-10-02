export const TEMPLATES = [
  {
    id: "ctf",
    label: "CTF challenge writeup",
    body: `## Challenge

- **Event:**
- **Category / points:**
- **Description:** (paste the prompt)

## Recon

What you looked at first and what stood out.

## Exploitation

\`\`\`terminal
$ command you ran
output that mattered
\`\`\`

## Flag

\`flag{...}\`

## Lessons learned

What would you try first next time?
`,
  },
  {
    id: "walkthrough",
    label: "Walkthrough",
    body: `## Goal

What the reader will be able to do after this.

## Prerequisites

- Tools:
- Knowledge:

## Steps

1. First step
2. Second step

## Troubleshooting

Common mistakes and how to spot them.

## Further reading
`,
  },
  {
    id: "research",
    label: "Research note",
    body: `## Summary

One paragraph: what you found and why it matters.

## Background

## Method

## Findings

## Disclosure / timeline

## References
`,
  },
] as const satisfies readonly { id: string; label: string; body: string }[];

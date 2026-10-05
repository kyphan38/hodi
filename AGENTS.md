# Agent instructions (hodi)

hodi is a minimal daily journal: a static Next.js PWA that talks straight to
Firestore. There is no server code - data is protected by `firestore.rules`.

## Read first

- `roadmap/ROADMAP.md` - invariants, data model, stages. Do not change an
  invariant without asking the owner.
- Keep it minimal. New ideas go to "Later" in the roadmap, not into the code.

## Git commits

Follow `.cursor/rules/git-commits.mdc`.

Format: `<type>(<scope>): <summary>`

Commit only. Do not push unless explicitly asked.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

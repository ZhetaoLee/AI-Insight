# Bug tracker

Lightweight, public file-based bug tracking for this repo — no external issue tracker needed for a project this size.

## Convention

- Each bug is one markdown file, named `YYYY-MM-DD-short-slug.md` (date the bug was filed, then a few kebab-case words describing it).
- **Active bugs** live directly in this folder (`bug/`).
- Once a bug is fixed, move its file into `bug/fixed/` (`git mv bug/<file>.md bug/fixed/<file>.md`) rather than deleting it — the fixed folder is a record of what was found and resolved, not a trash can.
- Use `bug/TEMPLATE.md` as the starting point for a new bug file.

## Fields

Every bug file should have:

- **Status** — `Active` or `Fixed` (should match which folder it's in).
- **Reported** — date filed.
- **Summary** — one sentence.
- **Details** — what happens vs. what's expected, steps to reproduce, and any relevant context (file/line, error text, environment).
- **Fixed by** *(fixed bugs only)* — commit hash or short description of the fix, and the date.

# Architecture decision records

One file per decision that was hard enough to be worth the argument, in the format of
ADR-001 and ADR-002: context, the options with their dimensions, a recommendation, the
decision, and what it makes easier and harder.

## Why these are not held by `tools/check-docs.sh`

That guard covers `SCOPE.md`, `docs/PRINCIPLES.md` and `CLAUDE.md` — it checks that each
still exists, is not hollowed out, and still carries its named sections. Those three are
**normative**: they say what the tools promise, how the code may be changed, and what is
forbidden. Cutting a rule out of one of them changes what is allowed, silently, and that
is worth a mechanism.

**An ADR is a record, not a rule.** It says what was decided, when, on what evidence, and
what was rejected. Its value is that it stays readable years later, not that it stays
enforced — nothing in the code depends on its wording, and a decision does not stop having
been made because somebody edited the file describing it.

Guarding sections here would also mean guessing which headings matter in a document whose
shape is deliberately per-decision, and a list of required headings ages every time an
ADR is written differently. `check-docs.sh` would gain a second job it does badly instead
of one it does well.

This paragraph exists so that nobody repairs the omission in six months. It is not an
omission.

## Status of what is here

| | decision | status |
|---|---|---|
| ADR-001 | validator as one tool with an optional second file, not a separate `audit.html` | Accepted, 2026-08-10. Working file, not committed |
| ADR-002 | default English text in the markup, overwritten by the applier | Accepted, 2026-08-19. Working file, not committed |
| [ADR-003](ADR-003-js-tokens-vs-zero-npm.md) | real JavaScript tokens against the zero-dependency rule | **Accepted, 2026-08-20** |

ADR-001 and ADR-002 predate the practice of committing these and live as local `.tmp`
files, which `.gitignore` excludes. That is a gap, not a design: the decisions they carry
are referenced from issues and from code comments that outlive any scratchpad.

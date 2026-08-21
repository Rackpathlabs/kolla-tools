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
| [ADR-001](ADR-001-combined-audit-mode.md) | validator as one tool with an optional second file, not a separate `audit.html` | Accepted, 2026-08-10 |
| [ADR-002](ADR-002-default-text-in-markup.md) | default English text in the markup, overwritten by the applier | Accepted, 2026-08-19 |
| [ADR-003](ADR-003-js-tokens-vs-zero-npm.md) | real JavaScript tokens against the zero-dependency rule | Accepted, 2026-08-20 |

ADR-001 and ADR-002 were written before the practice of committing these and lived as
local `.tmp` files that `.gitignore` excludes — one copy, one disk. They were moved here
on 2026-08-21 **with their reasoning untouched**. Where the world since disagreed with
them, each gained a section titled *Weryfikacja po fakcie* at the end rather than a
correction in place. ADR-002 predicted that an artefact of 74 entries would disappear;
it did not, and that is written down under its own heading instead of being tidied away.

An ADR whose reasoning is edited to match today is no longer evidence of anything.

## Language

**These are written in the language the decision was argued in, and are never translated
afterwards.** ADR-001 and ADR-002 are Polish; ADR-003 and this index are English. That
mixture is the decision, not drift.

The repository's English-only rule is narrower than it sounds: it covers **text the user
sees**, and it is enforced through the i18n dictionary by `tools/check-english.js`, which
reads the product HTML files and the scripts cut out of them. `README.md` and `SCOPE.md`
are English because they are addressed to strangers. An ADR is addressed to whoever
reopens the argument — in practice, the people who had it.

Translating one after the fact would mean re-writing reasoning, which is the one edit
these documents may not receive. Choosing a single language *going forward* would also
buy nothing: it would either force the argument into a language it was not held in, or
leave existing files needing the translation just ruled out.

## What no guard checks here

Stated because assuming it would be worse than not knowing:

- **`tools/check-docs.sh` does not read this directory.** It opens exactly `SCOPE.md`,
  `docs/PRINCIPLES.md`, `CLAUDE.md` and `README.md`; the string `adr` does not occur in
  it. The reasons are in the section above, and they are deliberate.
- **`tools/check-english.js` does not read this directory either** — and could not be
  pointed at it without contradicting the language decision. It is invoked three times,
  each time on a `(script, html, mode)` triple over a product page. It never opens a
  markdown file.

So an ADR here can be deleted, emptied, or rewritten and every build stays green. That is
the same trade as the one above: a record is not a rule, and nothing in the code depends
on its wording.

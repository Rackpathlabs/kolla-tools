# Working rules for this repository

Operational rules for making a change here: git and review hygiene, and the thresholds a
change is allowed to move. Two neighbouring documents cover different questions and this
one does not repeat them:

- [SCOPE.md](SCOPE.md) — what the tools check and deliberately do not. For an engineer
  deciding whether to trust a finding.
- [docs/PRINCIPLES.md](docs/PRINCIPLES.md) — design rules, each carrying the defect that
  produced it. For someone changing the code.

Every rule below carries its reason. A rule without one reads as pedantry and gets
deleted the first time it is inconvenient.

## Never write a closing keyword next to an issue number

Do not write **close**, **closes**, **closed**, **fix**, **fixes**, **fixed**,
**resolve**, **resolves** or **resolved** immediately before `#NN` in a commit message,
a pull request title, or a pull request description — unless you intend that issue to be
closed when the pull request merges.

**GitHub parses the phrase, not the sentence.** Negation does not help, quotation marks
do not help, and neither does the surrounding argument. There is no context in which the
platform reads the words around the keyword.

**The defect that produced this rule.** A pull request implementing part of issue #58
carried this sentence in its description, written specifically so that the issue would
stay open:

> Does **not** close #NN.

Merging it closed the issue. The sentence whose entire purpose was to keep the issue open
is the sentence that closed it — and it closed it silently, because an auto-closed issue
looks exactly like one somebody closed on purpose. It was noticed only because the final
state of every issue was checked against what had actually been delivered.

This is the same shape as the failures collected in `docs/PRINCIPLES.md`: a mechanism did
what its rules say and not what its name suggested, and the author's intent was never part
of the input.

**Write instead:**

```
issue #NN stays open
part of #NN
refs #NN
```

and put the closing keyword, if it belongs at all, on the first line of the description
and nowhere else.

**Why the prohibition is blanket rather than surface-by-surface.** The platform acts on
commit messages and on pull request titles and descriptions; other surfaces behave
differently and that behaviour is not ours to depend on. A rule shaped like the current
behaviour of somebody else's parser goes stale without anybody noticing — which is the
same reason the exception categories in this repository are written as criteria rather
than as lists.

## A ratchet threshold may only fall

Two guards hold a number that existing debt is measured against, and both are ratchets:

| threshold | file | what it counts |
|---|---|---|
| `BASELINE` | `tools/check-dictionary.js` | visible strings not covered by the dictionary |
| `ORPHAN_BASELINE` | `tools/check-markup-dict.js` | dictionary keys with no anchor in the markup |

The rule below applies to both. Naming one of two identical mechanisms invites the other
to drift.

**Raising a threshold because the guard started seeing a NEW CLASS of text is allowed.**
A new scenario, a new sink, a widened collection scope — the debt did not grow, the
instrument did. The pull request description must carry the decomposition, arithmetic
included, showing how much of the rise is coverage and how much is anything else. A
number offered without its parts is not a measurement; it is a request to be believed.

**Raising a threshold because new unanchored text was added is forbidden. No
exceptions.** A change that adds text outside the dictionary either gets to zero new
debt or does not land. This is the entire purpose of the threshold: existing debt is
described by a number, and every new string goes through a key.

> **This rule is incomplete until #86 lands.** `BASELINE` counts occurrences, not distinct
> strings, so adding a scenario raises it without adding a single new string — a rise that
> is neither coverage of a new class nor debt, and that passes the test below as
> "coverage". Do not lean on this rule to justify a rise until the unit is fixed.

**In the long run the number may only fall.** Every allowed rise is a rise for a reason
that is not debt, so the debt component itself never grows. When it drops, lower the
threshold in the same pull request — a threshold left above the measurement stops
protecting the distance between them.

**The defect that produced this rule.** In one session `BASELINE` went 444 → 461 → 488 →
530. Each step was decomposed and each was defensible, and the sequence still reads as a
threshold that follows the code instead of constraining it. Three of the four rises were
coverage, one was measurement artefact, and the fourth — during #9 — was **zero**: an
entire new interface layer went in without moving the number, which is what the guard is
for and what the previous three rises made hard to see.

A meter nobody trusts stops protecting anything. That is the lesson of #63, where a
language guard reported zero against thirteen hand-found positions and had been green
for weeks.

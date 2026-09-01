# ADR-003: Real JavaScript tokens against the zero-dependency rule

**Status:** **Accepted** (the repository owner, 2026-08-20) — **D for #101, C for #77**
**Date:** 2026-08-20
**Concerns:** #77 (a source-side language guard), #101 (network calls that do not look like
network calls), #57 (check-literals beyond four sinks)
**Code context:** main @ 2144d67, 13 guards, 475 assertions, no external dependency anywhere

> Written in English because it is committed to a public repository beside README.md,
> SCOPE.md, docs/PRINCIPLES.md and CLAUDE.md. ADR-001 and ADR-002 are Polish working files
> that were never committed; this one is a repository document, not a scratchpad.

---

## Context

Two open issues were filed against the same underlying limit, and a third has been open
longer for the same reason.

`docs/PRINCIPLES.md` already states the rule this is about:

> Where you can, forbid the construct instead of checking the content: a content check
> lets through whatever its author did not think of, while a shape check has no way to.

A **shape check** over JavaScript needs to know what a token is. Every attempt in this
repository so far has approximated that with regular expressions, and the approximation
has produced wrong answers four times.

### The evidence, all of it measured

**#101 — three network calls pass `check-offline.js`.** The guard holds a list of six
literal names. A name assembled at run time, an alias used without parentheses, and
`new Image().src = "https://…"` all pass. The third is not obfuscation: it is the ordinary
way to write a tracking pixel, and somebody can write it in good faith while the guard
reports no objections.

**#77 — two scanners gave the wrong count.** Both tried to tell code from comments with
patterns. Both desynchronised on a regular-expression literal, because `/` opens a comment
in one reading and a regex in another, and `"` inside a character class opens a string in
neither. The published figure — *"validator.html: 0 Polish literals"* — was false; there
were four.

**Today, a third instance.** The fixture half of `check-wiring.js` first recognised an
association by "the guard's name appears in a line that is not a comment". A continuation
line of a block comment does not begin with a star, and `guards.test.js` is full of such
comments, so a mention in **prose** counted as a check. Its own fixture caught it.

**`check-literals.js` is the counter-example that proves the rule.** It forbids a
*construct* — a literal in one of four sinks — rather than checking content, and it has
never given a wrong answer. Its limit is not correctness but reach: four sinks, which is
why #57 is open.

### One framing correction, measured rather than argued

The two issues are **not** blocked by a single decision. #101 has an escape that #77 does
not, and it was verified while writing this document.

Headless Chrome — already in CI, already used by `check-rendered.js`, no npm — accepts
`--log-net-log=<file>` and writes every attempted request. A probe page whose only content
is `new Image().src = "https://telemetry.example.invalid/pixel.gif"` produced a 685 KB log
in which that host appears sixteen times.

That measures the **effect**, not the representation, which is the deepest rule in this
repository. It answers #101 without a single token.

It does nothing for #77, because unreached code is by definition not executed: a browser
can only report what ran.

---

## Options considered

### Option A — a minimal tokeniser in `tools/`

Enough JavaScript lexing to separate strings, comments, template literals and regular
expression literals.

| Dimension | Assessment |
|---|---|
| Complexity | **Medium-high.** The hard part is not strings but deciding whether `/` opens a regex or is division, which needs the previous significant token |
| Correctness | **Approximate by construction.** The standard heuristic is right in almost every real case |
| Failure mode | **Silent wrong answers** — the exact failure this is meant to end, moved one level down |
| Dependency | none |
| Unblocks | #77, #101, #57 |
| Maintenance | ours, forever, including new syntax |

**For:** keeps the zero-dependency property intact and the whole mechanism inspectable.

**Against:** "almost every real case" is what the two scanners already achieved. A third
approximation would be the fourth instance of the same shape, and this time it would carry
the authority of looking like a real tokeniser. A wrong answer from an obvious hack is
cheaper than a wrong answer from something that looks rigorous.

### Option B — an npm exception for `tools/` only, never for the artifact

A real parser (for example `acorn`, itself dependency-free) used by tooling. The published
files stay what they are: single HTML documents, opened over `file://`, with no build step
and no dependency. **That part is not negotiable and is not what this option touches.**

| Dimension | Assessment |
|---|---|
| Complexity | **Low.** A correct parser exists and is small |
| Correctness | **Exact.** Real tokens, real AST |
| Failure mode | loud — a parse error is a parse error |
| Dependency | **first ever in this repository** |
| Unblocks | #77, #101, #57, and anything later that needs structure |
| Maintenance | upstream's, plus a lockfile and its supply chain |

**For:** the only option that gives correct answers, and the product is untouched.

**Against:** the property being spent has never been spent. There is no `package.json`,
no `requirements.txt`, no lockfile anywhere; `tools/upstream_watch.py` is Python but uses
only the standard library, so the existing precedent is a **second language, not a
dependency**. And a dependency inside the toolchain that verifies the product is a
dependency the product's guarantee now rests on.

**A finding that belongs here rather than in a footnote.** The CI step named *"Zero
zależności npm"* checks five paths **in the repository root only**. A `tools/package.json`
and a `tools/node_modules` pass it without a word — verified. So this option requires no
change to the guard, which is precisely the problem: the boundary would move silently.
Whatever is decided, that step's scope should be made to match its name.

### Option C — give up shape checking and narrow the promise

No tokeniser and no dependency. Each guard's header is narrowed to what it actually
verifies, and the gap is named with an issue number.

| Dimension | Assessment |
|---|---|
| Complexity | **None.** Partly done already |
| Correctness | the guards stay as correct as they are; the **claims** become true |
| Failure mode | none added |
| Dependency | none |
| Unblocks | nothing — closes the questions by declaring them out of scope |
| Maintenance | none |

**For:** it is already the treatment applied twice this week — to the claim that every
guard had been broken on purpose, and to point two of `check-offline.js`. Both were
improvements, and neither cost anything.

**Against:** #77 then has no answer at all. Polish text on an unreached path stays
invisible to every mechanism here, and the only defence is that somebody reads the diff.

### Option D — measure the effect in the browser, for what executes

For #101 specifically: run the pages under headless Chrome with `--log-net-log` and fail
on any attempted request. Verified above.

| Dimension | Assessment |
|---|---|
| Complexity | **Low-medium.** Chrome is already invoked; the log is JSON and large |
| Correctness | **exact for what runs**, blind to what does not |
| Failure mode | loud, and it measures the effect rather than the source |
| Dependency | none |
| Unblocks | **#101 only** |
| Maintenance | tied to a Chrome flag and its log format |

**For:** it answers the question the guard's name actually asks — *does anything go out to
the network* — instead of asking whether a name appears in the source. That is the
difference between measuring the effect and measuring the representation, and this
repository has paid for that distinction repeatedly.

**Against:** coverage-bound in the same way every scenario-driven check here is. A network
call on a path no scenario reaches is not observed, and `check-rendered.js` drives thirteen
scenarios, not the product.

---

## Recommendation

**Split the decision, because the measurement showed the two issues are not one.**

**For #101: option D.** It is verified, needs no dependency, and answers the guard's own
question rather than a proxy for it. Its coverage limit is the limit every scenario-driven
guard here already has and is already written down.

**For #77: option C, until the cost of not having it is demonstrated.** Narrow the promise,
name the gap, and leave it open. The argument is not that a source guard would be useless —
it is that option A's failure mode is a silent wrong answer, this repository has produced
three of those already, and the fourth would be the most convincing of them. Option B buys
correctness with a property that has never been spent, and nothing currently open is
expensive enough to spend it on.

If #77 ever becomes expensive — a Polish string reaching a user, a promise broken in
public — that is the moment to revisit, and the option to revisit is **B**, not A. Buying
an approximation to avoid buying a dependency is how the last three wrong answers were
paid for.

---

## Consequences

**Easier:**

- #101 gets an answer that measures the effect, with no dependency and no new language;
- the zero-dependency property survives intact and stays a true statement about this
  repository;
- guard headers keep being narrowed to what they verify, which is already the habit.

**Harder:**

- #77 stays open with no mechanism behind it, and that has to be written in the issue
  rather than implied by silence;
- `check-literals.js` remains limited to four sinks (#57), because widening it safely is
  the same problem;
- a netlog-based check is tied to a Chrome flag and a log format that upstream may change,
  and it produces a large artifact that has to be parsed rather than grepped.

**Revisit if:**

- a source-level defect reaches users, which turns #77 from a tidiness question into a cost;
- the netlog format or flag is withdrawn, which removes option D and puts #101 back with
  #77;
- any other need for real structure appears — a formatter, a codemod, an AST-based
  refactor — because then option B is being considered for several reasons at once and
  the arithmetic changes.

---

## Decision

**#101 — option D.** Observe the effect through `--log-net-log`. Verified empirically, no
dependency, and it measures the effect rather than the representation.

**#77 — option C**, until the cost of not having it is demonstrated. The reason is taken
from this document unchanged: option A's failure mode is silent wrong answers, this
repository has already produced three, and the fourth would be the most convincing of them.

**On revision, the option is B. Never A.** Buying an approximation to avoid buying a
dependency is how the last three wrong answers were paid for. If the source-side question
ever becomes expensive enough to spend something on, what gets spent is the dependency,
not the correctness.

## Actions

1. [x] Decision: **D for #101, C for #77** (the repository owner, 2026-08-20)
2. [x] Regardless of the decision: make the *"Zero zależności npm"* step's scope match its
       name — it checked the repository root only. Now `tools/check-npm.js`, whole tree,
       with two named exemptions for its own dirty fixture
3. [x] With D: `check-network.js` over the scenarios that already exist (#67), with a scope
       sentence describing what it measures from the first version — behaviour on the paths
       that ran, not "the tool does not reach the network". Delivered in PR #108: the guard
       exists, runs in `tools/run-tests.sh` and as its own CI step, has a fixture that proves
       it fails, and carries that scope sentence in its header
4. [x] With C: narrow #77's own promise in its issue and say plainly what is not
       checked (2026-09-01). The issue was retitled to name its remaining function —
       it collects dated evidence for the revisit condition below — moved to the
       `backlog — poza wydaniami` milestone, and its two superseded measurement
       tables marked as such. `tools/check-english.js` carries the narrowed scope in
       its own header; `SCOPE.md` was checked and deliberately left alone, because it
       makes no claim about interface language and a paragraph about one would be an
       item in a document whose name does not describe it
5. [ ] Not now, but if B ever returns: the exception is written down as applying to `tools/`
       alone, and the artifact guarantee is restated in the same commit
6. [ ] Revisit if a source-level defect reaches users, if the netlog flag or format is
       withdrawn, or if any other need for real structure appears — a formatter, a codemod,
       an AST-based refactor — because then B is being weighed for several reasons at once

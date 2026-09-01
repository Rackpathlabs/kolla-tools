# ADR-004: Anchoring dictionary keys whose text is composed in JavaScript

**Status:** **Accepted** (the repository owner, 2026-09-01) — option B, do not anchor
**Date:** 2026-09-01
**Concerns:** #58 (move the remaining interface text into the dictionary), #77 (the ledger
of Polish text that passed every guard), #86 (the threshold's unit)
**Code context:** `main @ 19774b2`, 231 dictionary keys, 108 anchored, **123 orphans**,
`BASELINE` 138 distinct strings, `ORPHAN_BASELINE` 123, 546 assertions

> Written in English for the same reason ADR-003 is: it is committed to a public repository
> beside README.md, SCOPE.md, docs/PRINCIPLES.md and CLAUDE.md.

---

## Context

ADR-002 chose option B: the default text of an interface string lives in the **markup**, and
the dictionary key is **anchored** to the element that carries it. `check-markup-dict.js`
compares the two and fails on drift.

123 of 231 keys have no such anchor, and `ORPHAN_BASELINE` records that as debt that may
only fall. The migration in #58 cannot begin without answering one question, because it
applies to every one of those 123: **a string composed in JavaScript has no element in the
initial document that shows it.** A toast does not exist until an event fires. A finding
message does not exist until a finding is produced. A severity label is created with the
finding it labels.

Measured on `main @ 19774b2`:

| orphan keys | namespace | what they are |
|---:|---|---|
| 84 | `v.*` | validator findings, messages, hints |
| 18 | `t.*` | toasts |
| 10 | `g.*` | generator diagnostics |
| 5 | `n.*` | parser notices |
| 3 | `sev.*` | severity labels inside findings |
| 2 | `hub.*` | `<title>` content and the `meta` description |
| 1 | `nav.*` | an `aria-label` on an element that does exist |
| **123** | | of which **40** carry `{…}` insertions or a plural variant |

The last two rows matter out of proportion to their size: they are the counter-examples
that keep the criterion from being "everything in JavaScript". `nav.tools` is set with
`setAttribute("aria-label", …)` on a `<nav>` that stands in the markup, and the
`data-i18n-label` form already exists — it is simply unanchored. `hub.title` fills a
`<title>` element that also stands in the markup. So "composed in JavaScript" is not the
criterion; **"has no element in the initial document that would show this text"** is.

---

## Options

### Option A — anchor everything, with hidden template elements

Give each composed string a hidden element carrying its default text, and let the guard
compare against that.

| Dimension | Assessment |
|---|---|
| Complexity | Low per key, 123 of them |
| `ORPHAN_BASELINE` | reaches 0 |
| Cost | text in the markup that exists **only for the guard** |
| Failure mode | quiet: the hidden text drifts from what is really shown and nothing notices |

**Against, and this is the whole of it.** ADR-002's anchor is not a storage location; it is
a claim about what the user sees **when JavaScript does not run**. That is why the text
stands in the markup instead of in a JSON file. A hidden element inverts that claim: it
carries text nobody will ever see in any state of the page, in a document whose entire
promise is that it works as a file opened over `file://`.

And for a string with insertions the hidden element cannot even carry the truth. The
markup would hold `Host <code>{host}</code> is in no group…`, which is not text the user
sees; it is a template. The guard would then be comparing a template against a template and
reporting agreement, which is a green answer to a question nobody asked — the third variant
of the empty green in `docs/PRINCIPLES.md`, manufactured on purpose.

### Option B — composed strings stay orphans, by definition, and the gap is closed elsewhere

Keys with no default-state element are **not** anchored. `ORPHAN_BASELINE` stops being a
number that should reach zero and becomes a number with a **measured floor**: the count of
such keys. Every key above the floor is a key that could be anchored and is not.

The coverage that the anchor was buying — the guarantee that this text faces the equality
criterion rather than only the thirteen scenarios — is bought instead by a **static pass
over the dictionary values themselves**, with no browser and no scenarios.

| Dimension | Assessment |
|---|---|
| Complexity | **none: the pass already exists** — see the measurement below |
| `ORPHAN_BASELINE` | falls to its floor, and the floor is written down |
| Cost | the floor has to be justified per key, not per namespace |
| Failure mode | loud — a value that is not English fails the build and names the key |

**The measurement that decides this, taken before the option was written.**
`tools/check-english.js` loads `I18N.dict` and adds **every value** to its corpus, in all
four of its modes. It runs under Node, drives no browser, and reads all **231** keys —
anchored or not, reached by a scenario or not.

Verified by injecting one Polish value into a dictionary and running it:

```
[validator] źródeł: 415  różnych słów: 919  przyjętych: 904  DO PRZECZYTANIA: 3
  ponownie   (×1)   dictionary key v.stale.run
      Uruchom teraz ponownie
```

Exit 1, and it names the key. So the static pass is not something this decision has to
build. What this decision has to do is **write it down and pin it**, because a guarantee
nobody has recorded is a guarantee somebody removes during a refactor while all tests stay
green.

**A consequence worth stating rather than discovering.** This closes, for language, the
class #77 calls *a dictionary key on a path no scenario reaches*. That class is listed in
#77's own table as invisible to `check-english.js`, and for **markup** text it is. For
**dictionary values** it is not, and has not been for some time. #77's ledger and its
decision are unaffected — the source-side guard over literals still does not exist, and the
six open entries there are literals that never went through the dictionary at all. What
changes is that moving a literal into the dictionary now buys static language coverage for
it, which is an argument for the migration in #58 rather than against this option.

### Option C — leave it undecided and migrate what is easy

Anchor the keys that have an element, leave the rest, and do not write down which is which.

Rejected without a table. It is the state today, `ORPHAN_BASELINE` has no floor, and every
future reader has to re-derive from the code whether 123 is debt or physics. The number
would keep looking like debt that nobody is paying.

---

## Recommendation

**Option B.** The criterion for anchoring is not the language a string is composed in but
whether the document has an element that would show it. Where such an element exists, the
key is anchored and the migration in #58 moves it. Where it does not, the key stays an
orphan **by definition, not by neglect**, and `ORPHAN_BASELINE` carries a floor equal to
the measured count of those keys.

Option A is refused because it would put text in the markup that exists only to be
compared, in a repository whose central rule is that a mechanism's name is a claim about
its scope. An anchor that anchors nothing the user can see is that claim broken in the
quietest possible way.

**What must land before the first batch of #58, in this order:**

1. This decision, accepted or rejected.
2. If accepted: an assertion that a non-English **dictionary value** fails the build,
   red on its fixture before anything is migrated. The guard exists; the proof that it
   exists does not, and until it does, option B rests on a measurement taken once.
3. The floor for `ORPHAN_BASELINE`, measured per key rather than per namespace, recorded in
   #58 with the classification.

---

---

## Decision

**Option B, accepted 2026-09-01.** Two things are settled with it, and both were sharpened
by the warm-up batch rather than by the argument above.

### The criterion is not "composed in JavaScript"

Two of the six warm-up keys disproved that on the first batch. `hub.title` filled a
`<title>` element that stands in the markup; `nav.tools` filled an `aria-label` on a `<nav>`
that also stands there. Neither was composed anywhere — both were assigned by hand in
`apply()` and simply had no anchor.

The criterion is: **the text has no element in the initial document.** It resolves into
three subclasses, and they do not share a fate. Confusing them is what made "123 orphans"
look like one number:

| | subclass | example | fate |
|---|---|---|---|
| **(a)** | a label for content that does not exist yet | `sev.error`, `sev.warn`, `sev.info` — they label findings, and there is no finding until one is produced | **orphan by nature.** Stays, permanently, with its reason recorded |
| **(b)** | an attribute for which no anchor form exists | `hub.desc` fills a `meta` element's `content`; the guard knows four forms and `content` is not among them | **a gap in the tooling, to be closed.** Temporary, and its marking must name the issue that closes it |
| **(c)** | a hand assignment in `apply()` with no reason behind it | `hub.title`, `nav.tools` | **work.** Anchor it |

(b) is the interesting one, because it looks like (a) from the outside. The element exists;
what is missing is the form. Marking it as (a) would park a repairable gap as physics.

### The floor is not a number

`ORPHAN_BASELINE` is removed. A single integer cannot distinguish (a) from (b) from (c), so
it turned every unanchored key into anonymous debt and made the honest state — "this key
will never have an anchor, and here is why" — indistinguishable from neglect.

In its place: **every key without an anchor carries an explicit marking with a reason code,
in one place, or it gets anchored.** The guard's requirement is a set being empty:

> the set of keys that are **unanchored and unmarked** is empty.

That is a criterion rather than a threshold, it needs no ratchet rule, and it cannot be
raised. The markings are a list somebody can read and disagree with, which an integer never
was. The guard prints (b) separately from (a), because (b) is supposed to reach zero and
(a) is not.

The starting state is honest rather than flattering: all 121 currently unanchored keys are
marked **to migrate**, not (a). Each batch converts markings into anchors, or into (a) with
a reason written next to the key.

## Consequences

**Easier:**

- #58 gets a criterion it can apply per key instead of a judgement per batch;
- `ORPHAN_BASELINE` starts meaning "keys that could be anchored and are not", which is a
  number that can honestly reach its floor;
- text moved into the dictionary gains static language coverage that does not depend on
  which scenarios run.

**Harder:**

- the floor has to be defended key by key, and a key placed below it wrongly is a key that
  silently stops being watched by the equality criterion;
- `hub.desc` fills a `meta` element's `content` attribute, and `check-markup-dict.js` has
  four anchor forms, none of which is `content`. Either a fifth form is added or that key
  joins the floor — the first batch hits this immediately, which is why it is in the first
  batch;
- the static pass reads what the dictionary **says**, never what the screen **shows**, so
  it cannot see a key that is never used. That is a different gap and belongs to
  `check-markup-dict.js`, not here.

**Revisit if:**

- `check-english.js` stops reading dictionary values, which would remove the whole basis of
  option B — hence the assertion in step 2;
- an anchor form is added that can carry a template honestly, which would make option A
  cost something other than a false claim;
- the floor stops falling for reasons other than the classification, which would mean the
  classification is being used to park work.

## Actions

1. [x] Decision: **B**, do not anchor (the repository owner, 2026-09-01)
2. [x] With B: assertion that a non-English dictionary value fails, red on its fixture
       before any migration — `tools/fixtures/english-dict-orphan.html`, four assertions
3. [x] With B: the floor is **not a number**. `ORPHAN_BASELINE` is removed and replaced by
       a readable list of markings with reason codes, and a guard requiring that the set of
       unanchored, unmarked keys is empty
4. [ ] With B: `hub.desc` is subclass **(b)** — add a `data-i18n-content` anchor form, in a
       small pull request of its own before the first namespace batch. The applier lives in
       three copies (#69, open and undecided), so the form goes into all three
5. [x] Either way: #58's batch rule that a migration batch must leave the visible-text
       snapshot **unchanged**, and any difference is a finding for the description rather
       than a candidate for `--update` — recorded in #58, and met by the warm-up batch

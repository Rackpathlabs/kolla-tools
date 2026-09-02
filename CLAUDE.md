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
**resolve**, **resolves** or **resolved** immediately before `#NN` — except in the one
form each surface allows, which is not the same on all three.

| surface | allowed |
|---|---|
| commit message, pull request description | the whole line, and nothing else on it: `Fixes #NN`, optionally with a full stop |
| **pull request title** | **nothing. Never.** |

`tools/check-closing-keyword.js` enforces exactly this on all three surfaces and runs in
CI on every pull request. The rule below is not advice; it is the thing that turns the
build red.

**Why the title is stricter, so it does not read as an inconsistency.** In a description
or a commit message, declaring the link is the point — the trailer is how one says "this
closes that". In a title it is only ever a side effect. GitHub's documentation names two
surfaces, the description and the commit message, and the title is not among them — but
this repository's merge settings copy the title INTO a commit message
(`squash_merge_commit_title`, `merge_commit_message`), and a commit on the default branch
is a documented surface. A commit on `main` already carries a past title complete with its
keyword and number. And if the title were parsed nowhere at all, the ban would stand
anyway: a title promising a link it does not create lies to whoever reads the list.

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

## Commits carry the project identity, never a person

Everything this repository publishes — commit metadata, commit messages, pull request
titles and descriptions, code comments — speaks about the work. Not about who did it.
It is a public repository, and the people who work in it did not agree to have their
names indexed as a side effect of a merge.

**Two surfaces, two different mechanisms, and they are not equally guarded.**

| surface | who writes it | guarded by |
|---|---|---|
| `author` / `committer` fields | git, from configuration | the repository's local `.git/config`, set to the project identity |
| message bodies, PR title and description | whoever is typing | `tools/check-personal-names.js`, on every pull request |

**Commits go out with the local repository configuration, never with the machine's global
one.** Global configuration belongs to the machine and follows its owner into every other
repository; a clone that falls back to it commits under whatever identity that machine
happens to carry, which on a fresh machine is a login name and a hostname nobody chose to
publish. Measured on 2026-08-21: all 185 commits across every ref carry the project
identity in both `author` and `committer`, so the configuration has held from the start.

**`.git/config` IS NOT CLONED. This is the entry step for every new clone, on every
machine, before the first commit:**

```
git config --local user.name  rackpathlabs-ops
git config --local user.email 310609378+rackpathlabs-ops@users.noreply.github.com
```

The protection this repository has today lives in one untracked file on one machine.
`git clone` does not copy it. A fresh clone — a new person, a new laptop, a rebuilt
container — starts with nothing, and nothing in the repository will put it back.

What saves that clone today is an accident of configuration and not a property of this
project: with no global `user.name` either, git **refuses to commit** instead of inventing
an identity from the login name and the hostname. That is a loud failure, which is the
good kind. But it is a fact about that particular machine. A machine whose owner has ever
set a global identity — which is most machines, because most people set it once and forget
— gets the silent version instead: the commit succeeds and carries a person.

So the two-line command above is not paperwork. It is the whole of the protection, and it
has to be run by hand because there is nowhere in a git repository to put it.

**Enforcement status, stated honestly because the two halves differ.**

- The `author` / `committer` half is enforced by **nothing** — no check reads those fields.
  It rests on a configuration file that is not even tracked and does not survive a clone.
  A clone that inherits a machine's global identity commits under a person's name and no
  build notices.

  **And no check ever could make this a barrier, only a warning.** Anything running in CI
  sees a commit's metadata after that commit exists and has been pushed — the wrong
  identity is already published to the branch by the time anything can object. What a
  guard on those fields would buy is that it never reaches `main`: the fix is a rebase on
  the branch, which is cheap, and no history that anyone has cited is touched. The entry
  step above is the only thing that acts *before* the commit, and it is a two-line command
  somebody has to remember to run.
- The message half is enforced on pull requests by `tools/check-personal-names.js`, in two
  different ways, and only one of them is a list.

  **The list.** It catches occurrences of strings on a **closed list of hashes**, and does
  not detect personal data in general. A name nobody put on the list passes without a
  trace. That is a content check over a list — the same class as the six API names in
  `check-offline.js` — and unlike that case, no effect-measuring alternative exists,
  because whether a string is somebody's name is a question about the world.

  **The shape.** A line beginning `Co-authored-by:` is refused on all three surfaces
  regardless of the address after the colon, which is the part a list can never reach: the
  address is sometimes a person, sometimes a service, sometimes `noreply`, and what they
  share is the construction. Measured on 2026-09-01, before the rule existed: such a line
  passed both surface guards green, so this paragraph described an enforcement that was
  prose. A mention of the trailer inside a sentence is not a trailer — the rule is anchored
  to the start of a line, deliberately, so that it can be written about, as it is here.
  `Signed-off-by` and the rest of that family are **not** covered; the reason stands beside
  the pattern in the guard.

  **And before either of them**, `.claude/settings.json` carries `"includeCoAuthoredBy":
  false`, versioned so it holds in every clone. That file could not exist until
  2026-09-01, because `.gitignore` excluded the whole of `.claude/` — the tool's shared
  half along with its local one. Configuration stops the trailer being written; the guard
  catches it when something writes it anyway.

The guard holds hashes rather than strings, and its failure message names a position and
twelve hex characters rather than the match. A file listing the protected names would
publish exactly what it defends, and a public CI log printing a hit would do it again.

**This rule takes effect on 2026-08-21. Three known occurrences in the history stay, and
one in the tree was removed the same day.**

| where | what | state |
|---|---|---|
| `b2c3867` | commit message body, two occurrences | reachable from `main`, stays; cited in 7 issues and pull requests |
| `16e341a` | commit message body, one occurrence | **orphaned** — reachable from no ref, only by SHA |
| `9df107e` | commit message body, one occurrence | **orphaned** — same |

The two orphans were on the branch behind PR #59, which was squashed: its commits never
reached `main`, and the squash concatenated their messages into `b2c3867`, which is why
one commit carries two occurrences. The branch itself no longer exists on the remote.

**And that is the argument of this section, demonstrated rather than asserted.** Those two
commits are reachable from nothing, and they are still there — GitHub serves an orphaned
commit by its SHA, and both are cited by SHA in PR #59 and #112. Deleting the last ref
that pointed at them removed a way of *finding* them and no part of their content. A
force-push would do the same thing, on 112 more commits, at the cost of every reference in
the table below it.
| `tools/check-docs.sh` | a code comment | removed 2026-08-21 |

The contents are not quoted here, for the reason the guard does not quote them either.

**Why the history is not rewritten.** Decided after the measurement, not before it, and
the measurement is the argument:

| measured 2026-08-21 | |
|---|---|
| commits on `main` | 112 |
| commits across every ref | 185 |
| distinct `author` values | **1**, the project identity, on 185 of 185 |
| distinct `committer` values | 2 — the project identity (124) and `GitHub <noreply@github.com>` (61) |
| personal data in commit metadata | **0 occurrences, in either field, anywhere** |
| e-mail addresses in message bodies | 1 distinct, `noreply@anthropic.com`, 181 occurrences |
| exposure | **3 occurrences, in 3 message bodies**, of which 1 commit is reachable from `main` |

So the trade is 112 invalidated SHAs against 3 occurrences of a first name — and the
rewrite does not even deliver the 3. A force-push on a public repository does not remove
published data: orphaned objects stay reachable by SHA, forks and clones hold their own
copies, and anything a platform has already served may be cached elsewhere. What it
certainly costs is concrete: every SHA on `main` invalidated, dead `commit_id` references
in closed issues, and every "the proof is in commit X" sentence in this repository broken
— and there are several, because that is how evidence is recorded here.

Thirty-seven invalidated SHAs for each occurrence removed, from a removal that removes
nothing, is not a close call. Paying a certain price for an uncertain benefit is an empty green in a
different domain: the appearance of a clean history, bought by breaking the record that
makes the history worth keeping.

So the rule says **in force from today, three known exceptions in the history** rather than
pretending to describe a repository that never carried them.

## A citation carries the evidence; the SHA is an aid

Write down what a commit **showed** — the sequence, the order, what was red and when —
in the issue or the document that relies on it. Then add the SHA. Never the SHA alone.

**Nothing enforces this.** No check can tell a pointer that still resolves from one that
resolves today and not next year, and none can judge whether a sentence carries enough of
the evidence to stand without the object. `tools/check-docs.sh` holds this section in
place so the rule cannot quietly vanish, and that is a different guarantee from anybody
obeying it.

**Why.** Evidence cited by SHA lasts exactly as long as the object stays reachable, and
reachability is not a property anybody here controls. A squash merge leaves every commit
of the branch unreachable from the default branch. Deleting the branch afterwards leaves
them reachable from no ref at all. A platform garbage-collects orphaned objects on its own
schedule, without notice, and owes nobody a warning. None of that is misconduct — it is
the ordinary lifecycle of a merged branch, and this repository has run it dozens of times.

**The defect that produced this rule.** PR #59 went in as a squash: all **50** of its
commits are unreachable from `main`, and two of them — `9df107e` and `16e341a` — are
reachable from no ref whatsoever. What those two showed was the discipline this repository
now runs on: guards created **red on purpose** before the migration they measure, with
`check-dictionary.js` first committed **with no threshold at all**, the number arriving a
day later and being lowered to the measured value rather than the measurement being raised
to it. That is the origin of the ratchet rule in the section below, and it was recorded
nowhere except in the commits themselves.

The whole argument rested on pointers into objects that had already lost their last
reference. The repair was to write the sequence out in the issues that lean on it, with
hours and with what each step made red, and to leave the SHAs behind it as an aid marked
as possibly ceasing to resolve.

**The objects are deliberately not anchored.** A tag would keep them alive, and two of the
three occurrences of a personal name in this history live in exactly those two commits —
so their eventual collection is welcome. That is also why the citation must not quote what
their messages said: the protected string is meant to disappear with the object, not to be
copied into an issue that outlives it.

## A ratchet threshold may only fall

**One guard holds such a number**, and it is a ratchet:

| threshold | file | what it counts |
|---|---|---|
| `BASELINE` | `tools/check-dictionary.js` | distinct visible strings not covered by the dictionary |

There were two. `ORPHAN_BASELINE` in `tools/check-markup-dict.js` was removed on 2026-09-01
by ADR-004 and replaced by something a ratchet rule cannot express: **the set of dictionary
keys that have no anchor and no marking must be empty.** A single number could not tell a
key that will never have an anchor from one nobody had moved yet, so the honest state and
neglect looked identical in it. What stands in its place is `tools/i18n-unanchored.txt` —
one line per key, with a reason code — which a person can read and disagree with. There is
no threshold there to raise, and this section does not govern it.

**Raising a threshold because the guard started seeing a NEW CLASS of text is allowed.**
A new scenario, a new sink, a widened collection scope — the debt did not grow, the
instrument did. The pull request description must carry the decomposition, arithmetic
included, showing how much of the rise is coverage and how much is anything else. A
number offered without its parts is not a measurement; it is a request to be believed.

**Raising a threshold because new unanchored text was added is forbidden. No
exceptions.** A change that adds text outside the dictionary either gets to zero new
debt or does not land. This is the entire purpose of the threshold: existing debt is
described by a number, and every new string goes through a key.

**Both thresholds count distinct things, and that is what makes the two cases above
exhaustive.** `BASELINE` counts distinct normalised strings — the key is the same string
its coverage criterion compares, so whitespace, letter case and digits inside the text do
not create a second item. This is the only threshold this section still governs.

This paragraph replaces an annotation that said the rule was incomplete, and the reason it
could be removed is worth keeping. Until 2026-09-01 `BASELINE` counted **occurrences**,
which scale with how many scenarios ran rather than with how much text is left: 530
occurrences were 138 distinct strings, one template contributed 32 of them, and the twelfth
scenario added 41 occurrences and zero strings. A rise caused by nothing but a new scenario
was neither coverage of a new class nor debt, and it passed the test above as coverage —
so the rule could be used in good faith to push through a rise that meant nothing. Changing
the unit closed that without adding a third case: a new scenario cannot raise a count of
distinct strings, because it brings no new string. Pinned by assertion, not by intention —
two report fixtures differ only in a second scenario rendering the same text, and the
string count is required to be identical across them.

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

## A guard's criterion never rides in a commit that changes the product

Two things live in `tools/` and only one of them may travel with a product change. The
distinction is the whole of this rule, because without it the rule would either forbid
something required elsewhere or forbid nothing at all.

**The RECORD OF A MEASUREMENT belongs in the commit that changes the thing measured.** A
threshold, a line in `tools/i18n-unanchored.txt`, a word accepted into
`tools/vocabulary-en.txt`, a golden file, a snapshot. These are not checks; they are what the
check read after the change. Separating them produces a commit that is internally
inconsistent — a threshold sitting below its own measurement, a golden describing output the
tree no longer produces — and the ratchet rule above says so outright: *when the debt drops,
lower the threshold in the same pull request.*

**The CRITERION OF A GUARD — what counts as a violation and how it is detected — never shares
a commit with a product change.** Separate commit, separate description. The reason is
revert, not tidiness: a commit carrying both cannot be undone in one direction. Undoing the
product change takes the detection with it, and undoing the detection takes the product change
with it, so the failure the guard exists to catch becomes unreachable exactly when somebody is
trying to reach it.

**The defect that produced this rule, and it is measured rather than imagined.** `b2c3867`
carried the markup of both tools together with `docs/PRINCIPLES.md`, `check-dictionary.js`,
`check-literals.js`, `guards.test.js` and nine fixtures. `git revert --no-commit` on it applies
cleanly — 26 files, 323 insertions, 1649 deletions, dictionary consistent, suite green — and
removes the entire apparatus that found the regression, along with the document explaining why
meters are built before the work. Reverting the regression stopped being an available move.

**And the rule is not hypothetical in the present tense either.** Measured over the sixty most
recent non-merge commits: fifteen touch the product and something under `tools/`; eleven touch
the product and a guard file; eight of those eleven move only a threshold and are correct by
the paragraph above. **Three mix a product change with a guard's criterion** — `9476b2c`,
`aa3d9d6`, `7d87a4c` — and all three were written within one day, by somebody who had read
every other rule in this document. That is the cost being priced here: not a story about a
commit from months ago, but three in the last sixty.

> NOT ENFORCED. Whether a hunk changes a criterion or records a measurement is a judgement
> about intent, and no check reads intent. A guard could count files and would fail the eight
> correct cases along with the three wrong ones, which is how a rule gets deleted the first
> time it is inconvenient.

## A milestone's name describes what is in it

An issue that fits no milestone goes to the waiting room — never to the nearest one that
roughly fits.

**Nothing enforces this rule.** It is judgement about what an issue is about, and no check
can make that call. Said plainly rather than left to be assumed: `tools/check-docs.sh`
holds this section in place, so the rule cannot quietly vanish from the document, but
nothing at all stops somebody breaking it. Those are different guarantees and only the
first one exists. (The scheme that would make this status machine-visible for every rule
here is #94, deliberately parked.)

`backlog — poza wydaniami` is that waiting room, and its description carries the exit
condition: an item leaves when a release exists whose name describes it, or when it stops
being a description and becomes a task with its preconditions settled. Time passing is
not an exit condition.

**The defect that produced this rule.** #94 was filed with no milestone, then put into
`v0.4 upstream data` because that was the newest one — and it has nothing to do with
upstream data. The proposed repair was worse than the mistake: rename `v0.4` to something
roomier. That is the manufacture of a bucket in one step. `v0.4` is an accurate name for
exactly one issue, and the right move was to leave it accurate and admit the other issue
had nowhere to go.

A milestone named after what it happens to contain stops answering the question people
open it for, which is what will be in the next release.

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

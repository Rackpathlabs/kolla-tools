# Design principles

These are the rules for changing this code. They are not part of the product's promise —
what the tools check, and what they deliberately do not, lives in [SCOPE.md](../SCOPE.md).
An engineer deciding whether to trust a finding needs that document, not this one.

Every rule below carries the defect that produced it, because without the defect it reads
as a truism.

Two families of rule govern this repository: what the tools may claim, and where a check
has to stand and how wide it has to look. Each rule below carries the defect that produced
it, because without the defect it reads as a truism.

### What the tools may not claim

**Severity must not exceed what the visible file proves.** A finding louder than its
evidence teaches operators to ignore the tool, and once that happens the accurate findings
stop working too. Collocated control and compute nodes are a warning until a `globals.yml`
shows Masakari. A missing `om_enable_rabbitmq_stream_fanout` is a warning, not an error,
because an absent key means the upstream default, which works and only becomes risky at
scale. Migration traffic sharing the API interface is an error with Masakari, a warning
with a Pacemaker cluster and only informational without either, because without any HA
tooling it is the upstream default and normal in a lab. The out-of-subnet VIP warning
described above is the fourth instance of the same rule.

**A tool may not say it checked what it only accepted.** An acknowledgment recorded in a
generated `globals.yml` as "headroom measured, switch applies queueing" reads as a finding
to whoever opens that repository a year later; the tool measured nothing, somebody ticked
a box. It now says "acknowledged by the operator; not verified by this tool". The mistake
was easy to make because output feels like a product the tool hands over rather than one
more place where the tool makes a claim — and it is the one place no deploy takes back.

This covers claims about the tool itself. "All visible text is English" was merged as a
completeness statement while eighteen notification messages were still Polish, living in
code the assertion never reached.

### Where a check has to stand, and how wide

**A check nobody has seen fail is not a check.** Every guard here has been broken on
purpose once, to watch it turn red. A guard meant to reject NUL bytes was written with a
shell pattern that could not contain a NUL byte, so the pattern was empty, matched every
file, and reported failures on files that were already clean — while its own verification
fell for the same trick. A guard meant to verify the Content-Security-Policy used a
pattern that excluded apostrophes, and the policy text is full of them, so it found no
policy tag at all and called two correct files broken. Both looked like working checks.
Neither was.

It extends to the instrument itself. Breaking three new rules on purpose produced
identical failures in unrelated fixtures: a substitution in the golden-file runner had
silently matched nothing, so one side of a comparison gained a field the other never got.
Seven fixtures were red for reasons belonging to none of the three breaks, and unexamined
they would have been accepted as the new expected output. Watching a check fail caught a
defect in the machinery that proves checks fail.

**A green result means nothing if the subject was not there to be measured.** This is the
third way a check can pass while proving nothing, and the worst of the three, because the
other two can be caught by breaking something on purpose and this one cannot: breaking the
thing does not light the lamp either, when the thing is absent. A category was narrowed so
that table headings would face the dictionary criterion instead of an exception, and the
measured numbers did not move — not because the narrowing held, but because that scenario
renders no findings, so no table exists and not one heading reached the audit. Reporting
unchanged numbers as agreement would have been the staleness probe again: a correct answer
to a different question. The only defence is to know what ought to be in view and check
that it was, which no amount of deliberate breakage can substitute for.

**The tooling is part of the system, not something beside it.** Production code here has
golden files, guards and three hundred assertions. The tooling had none of that, and it is
the tooling that failed: a progress counter three times over, a probe that read an
attribute instead of the screen, a set of exception categories that excused the very text
they were built to find, and two NUL bytes that sat in a guard's own source while the one
check written for NUL bytes did not look at the directory it lived in. Six failures, none
of them in the product.

The pattern is always the same. A scope looks reasonable — artefacts and shared sources —
and nobody questions it, exactly as nobody questioned a category that excused "the content
of <code> and <span>". So the question has to be asked of every guard in turn, and asked
about what it actually covers rather than what it was meant to cover: is the tooling in
scope, and if not, is that a decision or an oversight? For some the answer is a clean no —
a content-security policy has nothing to say about a CI script. For others it is a hole
that has been open since the guard was written.

**An assertion answers a question someone asked; a golden file answers questions nobody
asked.** Targeted assertions cover the cases their author thought of, which is exactly
their blind spot. A duplicated quorum rule once produced two findings for one fault at two
different severities, and over a hundred assertions missed it, because every one of them
asked about a specific finding code. A golden comparison of the whole output surfaced it
at once. Both kinds are kept; the golden files catch what nobody thought to ask. One known
gap is open as issue #26: the generator's golden files pin the file it emits but not the
severities of its diagnostics, so a severity change is invisible to them.

**A check built from watching one run describes that run, not the tool.** This is separate
from proving a check can fail: a check can fail immaculately and still never look at most
of the cases. The English-completeness assertion drove the generator through a single
configuration, and rules exclude one another — a release cannot be both retired and absent
from the matrix in the same run — so entire families of message were unreachable. Three
Polish strings passed it green. Widening it to eight configurations exposed eleven more
immediately. Where you can, forbid the construct instead of checking the content: a
content check lets through whatever its author did not think of, while a shape check has
no way to. Eighteen Polish notifications passed a language scan because they fired from
paths nobody invoked; forbidding a literal inside `toast()` catches them whatever language
they are in and whoever calls them.

**Parts that are each correct compose into an answer that is wrong.** A counter measuring
translation progress filtered by file path, paired quotes to find strings, and numbered
lines after stripping comments. Every step was defensible alone; together they hid
multi-line concatenated strings entirely, and their number supported a claim of full
bilingual coverage that was false — merged, corrected only afterwards. A composition needs
its own check against reality, not the sum of its parts' correctness. Its replacement
measures rendered output rather than source, and the counter was deleted rather than kept
with a warning label: a measure carrying "do not trust this" is an invitation for someone,
eventually, to trust it.

One hazard sits above the rest. A background timer added to the validator kept Node's
event loop alive, so every harness that loaded the tool hung until its timeout — looking
exactly like the frozen analysis under investigation at that moment. Instrumentation that
lies is ordinary; instrumentation that imitates the symptom being investigated confirms
the hypothesis under test.

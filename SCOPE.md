# Scope and limits

This document describes what the Rackpathlabs Kolla-Ansible tools check, what they
deliberately do not check, and where their answers stop being certain.

It exists because a tool that stays quiet about its blind spots teaches operators to
trust it more than it deserves. Everything below is true of the code as it stands; where
something is planned rather than implemented, it says so and names the issue.

## What these tools check

The **generator** builds a `globals.yml` and lints the file it produces: base image and
release against a support matrix, interface assignments (including the case where a VLAN
subinterface shares its parent device with another role), internal TLS and endpoint
naming, service dependencies, and the Octavia amphora network against the physical
networks derivable from the external interfaces. It can also import an existing
`globals.yml`: the form fills in, deprecated and unrecognised keys are reported, and
export patches the original file instead of rewriting it.

The **validator** parses an INI inventory: group structure, `:children` expansion, host
range patterns, duplicate hosts and addresses, quorum-sensitive group sizes, role
collocation, and group names that were renamed or removed in the selected release. It
optionally accepts a `globals.yml` as a second input, which enables the three checks that
need both files at once — fencing evidence for Masakari, Cinder clustering, and VIP
collisions — and lets one collocation finding escalate when the globals file proves the
escalation condition.

The full rule set is not reproduced here, and this is deliberate: a list in a document
drifts from the code that implements it. Every finding carries a stable code, the
severity it earned, and the line it refers to. Those are the authority. This document
covers the boundary, not the contents.

## What these tools deliberately do not check

Each exclusion below is a decision, not an omission. The reason matters more than the
item, because the reason is what tells you where to look instead.

**Toggling `om_enable_rabbitmq_quorum_queues` between deployments.** Switching queue type
on an existing deployment makes services try to redeclare queues with a different
`x-queue-type`, which fails with `PRECONDITION_FAILED - inequivalent arg` and puts
containers into restart loops while the deployment reports success. Detecting it requires
comparing the file against the last deployed revision — git history, not file contents. A
fresh clone cannot answer it, and neither can a browser.

**The `openstack_release` value against the *installed* kolla-ansible version.** The
release-to-distro matrix is checked. Whether the playbooks on the deployment host are the
matching major version is not, because that requires the environment: `pip show
kolla-ansible`, or the repository the operator actually deployed from. Rendering Epoxy
templates over Dalmatian images is a real failure mode; it is simply not one a file can
reveal.

**Fencing agent configuration and service-level overrides.** The validator can tell that
an inventory carries no BMC field at all, which is enough to say fencing cannot exist. It
cannot tell whether existing fencing works. `masakari-monitors.conf` (including
`disable_ipmi_check`, which defaults to true), Pacemaker `stonith-enabled`, fence agent
definitions and `nova-compute` overrides all live outside `globals.yml` and the inventory.

**Switch configuration, bond bandwidth and QoS policy.** Several findings concern traffic
that shares a physical link. Whether that link has measured headroom, whether the switch
applies queueing, and how LACP hashes a given flow are facts about hardware and network
configuration. No file we read contains them. Where a rule depends on such a fact, it
offers an acknowledgment that records the operator's decision instead of pretending to
have verified it.

**Per-host heterogeneity in `host_vars`.** The current input model is one inventory file
and optionally one `globals.yml`. Configuration that varies per host — an
`octavia_network_interface` present on two of three health-manager nodes, per-host Cinder
backend overrides that split a cluster despite a cluster name being set — lives in
`host_vars` and `group_vars` directories that are never read. This is the exclusion most
likely to surprise, because the resulting failures look random: a load balancer that works
or hangs depending on which host answered.

## Where certainty ends

Some checks are certain, and some are inferences. The tools distinguish between the two,
and the distinction is visible in the severity and in the finding's own text.

The clearest case is the VIP check. Comparing `kolla_internal_vip_address` against every
`ansible_host` in the inventory is exact: if the address is already a host's address, that
is a collision, and the finding is an error. Deciding whether a VIP sits *outside* the
right subnet is not exact, because an Ansible inventory carries addresses but no netmasks.
The subnet is inferred from the host addresses — a shared first three octets is treated as
a `/24`, a shared first two as a `/16`, and anything less consistent produces no finding
at all rather than a guess. Because it is an inference, that finding is a **warning, not
an error**, and it states the assumed mask in its own text along with the fact that a
different subnet layout makes it a false alarm.

The same reasoning applies wherever a condition lives in a file the tool cannot see. A
single-file validator cannot know whether an inventory belongs to a deployment running
Masakari, so hyperconverged control and compute nodes are reported as a warning that names
the escalation condition explicitly. Load the `globals.yml` and the same configuration
becomes an error, because now the condition is proven rather than suspected.

When we are not certain, the severity comes down and the finding says why. It does not go
silent, and it does not round up.

## What "no findings" means

It means no conflict was found with what these tools can check. It does not mean the
configuration is correct.

The wording in both tools reflects this: a clean run reports *no objections within what
this tool checks*, not *correct*. Everything in the two sections above is still unchecked,
and a deployment can fail for reasons no static check reaches.

One case deserves stating separately, because it is easy to misread. When the validator
has a `globals.yml` loaded, it uses that file **only** for the rules that need both files
at once. It does not lint the `globals.yml` itself — interfaces, TLS, service
dependencies and release compatibility are the generator's job, and duplicating them
would mean two copies of the same lint drifting apart. A `globals.yml` that produces no
findings in the validator has not been checked as a `globals.yml`; it has been checked for
conflicts with that particular inventory. The interface says so next to the loaded file,
and it is repeated here because it is the single most plausible way to over-trust these
tools.

## The upgrade path mode

The validator can be given a target release in addition to the current one. It then reports
what changed along the path between them — but only for things that exist in the files you
loaded.

**What it shows.** For every release between your current one and the target, any inventory
group, service or `globals.yml` key present in your input that was renamed, removed, or had
its surrounding arrangement changed. Each item names the release it changed in, the file and
line in your own input, and what to do about it. Renames are errors because the old name
stops being recognised; removed services are warnings; changes that only alter circumstances
are informational.

Some changes cannot be fixed by editing a file at all. Switching RabbitMQ queue type between
deployments is the reference case: services try to redeclare existing queues with a different
type, fail, and enter restart loops while the deployment reports success. Those items are
marked as requiring an operational step rather than an edit, and the tool states that it
cannot verify whether the step was taken — that needs deployment history, which is covered in
the exclusions above.

**What it does not show.**

- It is not a summary of the release notes, and reading it is not a substitute for reading
  them. It answers a narrower question: *what in my files is affected*. Everything that
  changed in components you do not have, or in defaults you never set, is absent by design.
- It only sees `globals.yml` and the inventory. Changes to anything else — role internals,
  container images, service configuration under `/etc/kolla/config`, host packages — are
  invisible to it.
- It does not check image compatibility, database schema state, or whether the upgrade will
  actually succeed. Nothing here inspects a running environment.
- It reports changes introduced **after** your current release. A key already deprecated in
  the release you run today is not a change along the path, and the validator does not lint
  `globals.yml` on its own — that is the generator's job.
- Downgrades are not supported and the tool says so instead of producing a list. Kolla-Ansible
  does not support them; returning to an earlier release means restoring an environment, not
  editing files.

**Where the data is incomplete, it says so.** Deprecations are catalogued per release from the
kolla-ansible release notes, and some releases have not been catalogued. A path crossing one
of them produces an explicit warning naming the release, because an empty result and an
unexamined release look identical from the outside. That warning is the difference between
"nothing changed" and "we did not look".

## Design principles

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

## Why this document exists

Static analysis is worth something only if its limits are stated as plainly as its
results. A tool that reports nothing and says nothing about why it might have nothing to
say is indistinguishable from a tool that is not working.

If you are looking for a reason not to trust these checks, this page is where you should
find it — rather than in an outage.

# ADR-005: The upstream defaults register

**Status:** **Accepted** (the repository owner, 2026-09-08) — separate block,
emitted keys only, derived values shown not compared, watcher applies values
and never semantics
**Date:** 2026-09-08
**Concerns:** #81 (curated per-release defaults table), #9 (diff view — closed
against the tool's own initial state), #182 (a key name Kolla never had),
KV-12a in docs/RULESET-KV.md
**Code context:** `main @ 961e4c8`; buildYaml emits 32 keys; KOLLA_MATRIX.keys
knows an upstream default for 4, of which the generator emits 1

## Context

The generator says two things about upstream that it cannot back today. The
diff view compares a form against the tool's own initial state and says so,
because the matrix knows one relevant upstream default out of 32 emitted
keys. And every key name the generator writes is a claim that Kolla-Ansible
reads that name — a claim that was false for four releases: #182 found
`kolla_enable_letsencrypt`, a variable that occurs nowhere in the upstream
tree, emitted since v0.1, mapped on import, and used by KV-14 as the
exemption from a real error. It was found by cloning kolla-ansible and
grepping by hand while measuring something else.

Measured on 2026-09-08 against tags 20.5.0, 21.2.0 and 22.1.0:

- of the 32 emitted keys, 19 have a scalar default in `group_vars/all`
  across all three releases, 9 are Jinja expressions (`api_interface:
  "{{ network_interface }}"`), 3 have no value at that level and are
  defined in a role, and 1 was our own non-existent name (fixed in v0.4.1);
- 13 of the 19 scalars changed spelling between 21.x and 22.x — `"no"` to
  `false` — with no change of value;
- the source path itself moved: a single `ansible/group_vars/all.yml` in
  20.x, a directory `ansible/group_vars/all/*.yml` of 52–56 files from 21.x.

Three constraints stand: zero dependencies in the product, every HTML file
self-contained, shared code pasted byte-identically and guarded by
check-blocks. And one principle, written after #182 into
docs/PRINCIPLES.md: a key name is a claim about upstream and needs a source.

## Options considered

**Where the data lives.** (a) Extend `matrix.js` — one table, already pasted
into all three files. (b) A new block `KOLLA-DEFAULTS` in `defaults.js`,
pasted into the generator only. (a) makes the validator and the hub carry a
table only the generator reads; the dictionary already costs them 7–11 % of
their size for the same reason (ADR-001, second revision). (b) adds one
line to `blocks-lib.sh` and nothing to the other two files.

**Scope.** (a) Every key in `group_vars/all` — several hundred entries,
maintained per release, read by nobody in the tool. (b) Exactly the keys
buildYaml emits. (b) is the only scope where the table can double as the
guard the PRINCIPLES entry is waiting for: a key cannot enter buildYaml
without a sourced entry.

**Jinja values.** (a) Evaluate them — needs a Jinja interpreter and the
whole variable context, and produces a value the file does not contain.
(b) Store the expression verbatim as `kind: "derived"`, show it, never
compare it. (a) is the compatibility matrix guessed from memory, in code.

**Comparison.** Byte comparison of literals would report 13 false default
changes on the 21.x → 22.x boundary. Comparison through `yamlBool` where
both sides are booleans, literal otherwise; the upstream spelling stays
visible because the change of spelling is itself information.

**Source.** A tag alone no longer identifies the file. Each catalogued
release carries `{ tag, path, sha }` (blob for 20.x, tree for 21.x+), each
value carries `path` and `line`, and each release carries
`catalogued: true|false` in the shape of `deprecationsCatalogued`: an
uncatalogued release says "not examined", never "no difference".

**The watcher.** (a) Report defaults drift, apply nothing — a person
retypes a value the machine already read, at the one step where a typo just
cost four releases. (b) Apply values and source SHAs; never touch `keys{}`,
`kind`, or a severity. The watcher's PR description says so in one
sentence, beside the sentence it already carries about `keys{}`.

**KV-12a.** #81 suggested the "emit explicitly" contract should become the
rule for every known default. That writes 19 lines repeating upstream
defaults into every file and buries the two that matter at scale. The
contract stays with `notable: true` in `KOLLA_MATRIX.keys`; the register
compares, it does not force emission.

## Recommendation

Option (b) on every axis above.

## Decision

1. `defaults.js`, block `KOLLA-DEFAULTS`, generator only.
2. Scope is the emitted key set; extension happens only together with a
   new emitted key, which must arrive with its source.
3. `kind: scalar | derived | absent`. Derived values are shown with their
   expression and never compared. Absent values name the role that
   defines them.
4. Comparison through `yamlBool` for booleans, literal otherwise; upstream
   spelling displayed as found.
5. Source per catalogued release (`tag`, `path`, `sha`) and per value
   (`path`, `line`); `catalogued` flag per release; the three maintained
   releases first.
6. `upstream_watch.py` gains a defaults drift class; `--apply` writes
   values and SHAs, never semantics; the draft PR description states both
   halves.
7. KV-12a unchanged: explicit emission remains tied to `notable`.

`tools/check-defaults.js` guards the seam: every emitted key has an entry,
every entry is emitted, every scalar or derived entry in a catalogued
release has a source. It reads the source text, like the other registry
guards, and asserts the size of each extract before using it.

## Consequences

Easier: the diff view gets a second, honest baseline — "differs from
kolla-ansible 22.1.0" — for scalars, with the tag in the sentence; the
SCOPE.md paragraph that refused the claim is rewritten to say where the
claim now holds and where it still does not; a key name can no longer
enter the generator without somebody writing down where upstream defines
it, which is the enforcement the PRINCIPLES entry lacked.

Harder: three releases × 32 keys is a table that ages with every upstream
tag, and the watcher becomes the only thing standing between it and a
stale claim — the weekly job must stay green and read; `derived` entries
will disappoint anyone expecting a number, and the interface has to make
"shown, not compared" legible rather than apologetic; generator.html grows
by the block, and ADR-001's second revision set the next threshold at
150 KB of own logic — the block is data, not logic, but the file size is
what the reader sees.

Revisit when: a second tool starts reading the table (then the block moves
to all consumers and option (a) is back), when a release is catalogued from
a source other than `group_vars/all` (role defaults would need a second
`kind` or a second table), or when the watcher's defaults class opens a
draft PR that a reviewer cannot judge from the diff alone — that is the
signal that "values, not semantics" was the wrong cut.

## Amendment 2026-09-08

Written the same day as the decision, because measuring the three keys the
context called "defined in a role" showed that none of them is.

**The context sentence was wrong.** It said "3 have no value at that level and
are defined in a role". Measured against 20.5.0 and 22.1.0 with a full clone:
`storage_interface` was **removed** from kolla-ansible — the removal note first
appears in tag 15.0.0 — and the two Octavia names,
`octavia_amp_network_type` and
`octavia_amp_network_provider_physical_network`, occur **nowhere in the tree**
in any form. They are keys inside the `octavia_amp_network` mapping. So of the
four keys with no scalar in `group_vars/all`, three were defects of this tool
rather than facts about upstream, and they were fixed in #184 and #185 before
the register was written. Filed and closed: #182, #184, #185.

**Two more kinds.** `kind: "scalar" | "derived" | "absent"` does not cover
what was found:

- `kind: "map"` — the key is a mapping whose defaults live in a role rather
  than in `group_vars/all`. Carries `path` and `line` of the role file and the
  default map itself, because Ansible replaces dictionaries and the generator
  has to emit the whole thing. `octavia_amp_network` is the first entry.
- `kind: "removed"` — the key existed upstream and was removed. Carries
  `removedIn` and what the variable used to mean. Nothing in the emitted set
  has this kind any more, and the kind exists so that the next one is recorded
  rather than deleted: `RETRACTED_KEYS` in the generator holds the same
  distinction for import.

**The key count moved.** The decision was written against 32 emitted keys. The
generator now emits **31**: three flat names went, one mapping arrived. The
scope rule is unchanged — the register covers exactly what buildYaml emits —
but the number in the context section above is the one measured before the two
fixes.

**What this changes about the decision: nothing, and that is the point.** Every
axis still resolves the same way, and the case for the register got stronger
rather than weaker. Four of thirty-two emitted keys — one in eight — were
claims about upstream with no source behind them, all four found by hand with a
clone and a grep, none of them by any guard. The register is the mechanism that
makes the fifth impossible to add.

## Actions

- [ ] `defaults.js` with the three maintained releases, sourced (PR 1)
- [ ] `tools/check-defaults.js`, red fixtures first (PR 1)
- [ ] diff view second baseline; snippet sentence conditional; dictionary
      assertion narrowed to entries carrying `{tag}` (PR 1)
- [ ] SCOPE.md paragraph rewritten with the measured numbers (PR 1)
- [ ] `upstream_watch.py` defaults class; workflow PR description (PR 2)
- [ ] #81 closed when both PRs are on main and the watcher has run green
      once on a schedule
- [x] the three keys the context called "defined in a role" measured; #184
      and #185 filed and fixed before the register (amendment above)

# Contributing

## Before your first commit

```
git config --local user.name  rackpathlabs-ops
git config --local user.email 310609378+rackpathlabs-ops@users.noreply.github.com
```

This repository is public, and `.git/config` is not cloned — a fresh clone starts with
nothing, no matter how many commits carry the project identity already. A machine that
has a global `user.name` set will commit under a person's name instead, silently, and no
build notices: the commit succeeds, the identity is wrong, and nothing in CI reads the
`author` field.

## Issue references

| surface | allowed |
|---|---|
| commit message, pull request description | the whole line, and nothing else on it: `Fixes #NN` |
| pull request title | never, under any form |

Where a closing keyword does not belong at all, use one of:

```
refs #NN
part of #NN
issue #NN stays open
```

GitHub parses the phrase, not the sentence — negation and quotation marks do not change
what a keyword next to a number does, and neither does the argument around it.
`tools/check-closing-keyword.js` enforces this on all three surfaces — commit message,
pull request title, pull request description — in CI on every pull request.

## No Co-authored-by trailers

This repository's commit messages and pull request text speak about the work, not about
who did it. The guard refuses a line beginning `Co-authored-by:` on all three surfaces
regardless of the address after the colon.

## Running the checks

```
bash tools/run-tests.sh
```

The rendering and network sections drive headless Chrome, taken from `CHROME=` or from a
standard install path. Without one, the runner fails loudly on those sections instead of
skipping them — a skipped section and a passed one must never look the same. A pull
request has to be green in CI before it merges.

## Who reviews what

Files listed in [`.github/CODEOWNERS`](.github/CODEOWNERS) need a review from the owner
named there. Everything else — the site, meta tags, SEO, images — goes through an
ordinary pull request. This is a line of responsibility, not a judgement about trust.

`enforce_admins` stays false: a repository administrator can merge past the code-owner
review this branch protection requires, and nobody else can. The asymmetry is deliberate —
with a single owner, a pull request opened by that owner has nobody to approve it — and it
has been used: #177, 61 files all under CODEOWNERS, merged with `--admin`. It also means
the guarantee reads "an owner reviewed it, unless an administrator chose otherwise", and
the second half is invisible from the pull request.

## Screenshots, logs, examples

No home paths, no login names, no hostnames, no addresses from private networks — in
issues, in pull requests, and in images attached to either. `tools/check-personal-names.js`
guards text against a closed list of known names; nothing checks images, so that
responsibility stays with whoever attaches one.

Build example inventories and configuration snippets out of addresses nobody owns and
names that describe nothing but position: the RFC 5737 documentation ranges
(`192.0.2.0/24`, `198.51.100.0/24`) and host names of the form `host01`, `host02`. Host
names that need a dot use the RFC 2606 documentation TLD (`host01.example`); the same rule
that keeps addresses out of anybody's network keeps names out of anybody's zone.

## Where the rules live

- [CLAUDE.md](CLAUDE.md) — operational rules: git and review hygiene, and the thresholds
  a change is allowed to move.
- [docs/PRINCIPLES.md](docs/PRINCIPLES.md) — design rules, each carrying the defect that
  produced it.
- [SCOPE.md](SCOPE.md) — what the tools check and deliberately do not.

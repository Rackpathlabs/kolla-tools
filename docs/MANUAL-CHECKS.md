# Manual checks

**This is a procedure, not a guard. Nothing enforces it and nothing can.**

Everything in `tools/check-*` answers a question a machine can settle. This file holds the
questions it cannot — the ones that need a person, a keyboard and ten minutes. Running it
is a decision somebody makes; skipping it produces no red build and no notification.

Say that plainly, because a procedure written in the same tone as a guard gets read as one,
and then its silence gets read as a pass.

## Why these particular checks are here

`tools/check-a11y.js` proves the **construction** that lets a browser handle the keyboard:
every clickable thing is an element the browser puts in the tab order by itself, nobody has
reordered that sequence with a positive `tabindex`, the focus ring exists and is never
removed without a replacement, the diagnostics list announces its own changes, and an
invalid field points at the text saying what is wrong.

Correct construction does not prove the page can be traversed. Broken construction proves
it cannot. The guard answers only the second question.

It cannot answer the first because **a keyboard event injected by a script is not a trusted
event**: `isTrusted` is false and the browser does not move focus after it. A probe
"pressing Tab" would advance its own variable and report a traversal that never happened —
which is worse than no measurement, because it looks like one. Driving a real browser from
outside means the DevTools protocol and a hand-written WebSocket client, a class this
repository has already refused twice.

And a **focus trap** is a statement about a sequence — "from here you cannot get out" — not
about any single element. Every node in a trap can be built correctly. Nothing in a DOM
dump shows it.

## Last run

| date | browser | result |
|---|---|---|
| — | — | **never run** |

The table is empty and says so, rather than carrying the date this file was written. Nobody
has pressed Tab through these tools yet; the two defects fixed alongside this document were
found by `tools/check-a11y.js`, which measures construction and cannot press anything.

Add a row on every run. A stale date is information — it says how long ago somebody looked.
A date that records the writing of the procedure instead of its execution is the same lie
as a green build over a check that never ran.

## The procedure

Open the file directly from disk (`file://`), because that is how these tools are used.
Do not touch the mouse from the first `Tab` to the last step — that is the whole point, and
it is easy to break without noticing.

### A. Generator — `generator.html`

1. Click once in the address bar, then press `Tab`. **The first stop is "Skip to content".**
   It should become visible when focused; if it stays invisible, the skip link is decorative
   and does not work.
2. Press `Enter` on it. **Focus should land in the main region**, not scroll the page while
   focus stays in the header.
3. `Tab` through the header: the three navigation links, then the theme button.
   **Every stop must be visible** — a ring, a shadow, a changed border. A stop you cannot
   see is the defect this list exists for.
4. Press `Enter` on the theme button three times. **The theme cycles system → light → dark →
   system**, focus stays on the button, and the button's announced name changes with it.
5. Continue `Tab`ping into the form. At each field: **the label is readable next to the
   focused control**, and the hint below it does not disappear.
6. Find `kolla_internal_vip_address`, empty in the initial state and marked invalid. With
   focus in it, **the message saying the value is required must be reachable** — it is wired
   through `aria-describedby`; with a screen reader on, it should be read out after the label.
7. Type an invalid address (`10.0.0.999`). **The diagnostics list updates**, and with a
   screen reader on, the change is announced without focus moving.
8. `Tab` to the output panel: `Copy`, `Copy link`, `Download globals.yml`.
   **All three are reachable and visible when focused.**
9. Press `Enter` on `Copy link`. **The toast appears**; focus does not jump.
10. `Shift+Tab` all the way back to the top. **The order is the reverse of the way down**,
    with no stop skipped and no stop that only appears in one direction.

### B. Validator — `validator.html`

1. `Tab` from the address bar. **The skip link, the navigation, the theme button**, as above.
2. `Tab` to `Example with errors` and press `Enter`.
3. `Tab` into the findings list. Each finding's line number is a button.
   **Every one of them is reachable**, and pressing `Enter` selects that line in the editor.
4. **Check where focus goes after that.** It should stay on the button, or move somewhere a
   person can find. If it disappears into the editor without warning, that is a finding for
   this list.
5. `Tab` into the inventory editor. **The focus ring must be visible** — this was broken
   until 2026-09-02: the outline was removed with nothing in its place, on the one field
   this tool is built around.
6. Inside the editor, press `Tab`. **It moves focus out of the field** rather than inserting
   a tab character. If it inserts one, the editor is a focus trap and there is no way out
   without a mouse.
7. `Tab` to `Copy report`, `Export Markdown`, `Export JSON`. **All three reachable and
   visible.**
8. Load a `globals.yml` through the file button using only the keyboard. **The hidden file
   input must not be a stop** — it is removed from the accessibility tree on purpose and the
   visible button is what opens the dialog.

### C. Both — the theme and the printout

1. Set the operating system to light mode with no stored choice in the tool.
   **The page follows the system.**
2. Press the theme button once. **The choice overrides the system and survives a reload.**
3. Print to PDF from the dark theme (`Ctrl+P`). **The result is on white paper with dark
   text**, no dark bands, no navigation and no buttons.

## What to do with a finding

Open an issue with `area:repo` and the step number from this file. Do not fix it in the
same change as this document — the rule about a guard's criterion applies to a procedure
too: what it asks and what it found are two commits.

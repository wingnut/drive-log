# Körjournal – Tjänstebil

A small React + TypeScript + Vite + Material UI app for keeping a
company-car drive log (körjournal) for Swedish tax (Skatteverket)
purposes: date, start/stop odometer, distance, and business reason per
trip.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

To build a static production bundle:

```bash
npm run build
npm run preview
```

## Features

- **Odometer chain that can't break** – Start ODO and Stop ODO are
  never stored; they're derived by walking the log from a single
  baseline odometer value plus every trip's own distance, in order.
  A trip's Start ODO is *structurally* equal to the previous trip's
  Stop ODO — there's no "check if it matches" step because it's
  computed, not entered.
- **Insert a row anywhere** – click the insert icon on any row to add
  a forgotten trip above it (or "Lägg till resa" to append at the
  end). Every later trip automatically shifts its Start/Stop ODO to
  keep chaining correctly — their own recorded distances don't change.
- **Distance and Stop ODO are two-way linked** – edit whichever one you
  know; the other updates to match. Editing a trip's distance (or its
  Stop ODO) also cascades: every later trip keeps its own distance
  fixed but shifts its Start/Stop ODO by the same delta, all the way
  down the log.
- **Editable baseline** – the very first trip in the log has no
  predecessor, so its Start ODO is directly editable — that's the
  log's baseline odometer reading. Change it and the whole chain
  shifts, again without touching anyone's recorded distance.
- **CSV import** – load an existing log with the columns `Date`,
  `Start ODO`, `Distance`, `Stop ODO`, `Reason`. Each row's distance is
  recomputed as `Stop ODO - Start ODO`; the first row's `Start ODO`
  becomes the baseline. If a row's `Start ODO` doesn't match the
  previous row's `Stop ODO` in the file, or the file's own `Distance`
  column disagrees with the recomputed value, you get a warning (the
  chain is still rebuilt correctly — the warning just tells you the
  input file had a gap or a bad number).
- **CSV export** – download the current log in the same column shape,
  ready to hand to your accountant or Skatteverket.
- **Validation** – rows with a negative distance, a missing reason, or
  a date earlier than the previous row's are flagged with an icon and
  tooltip in the table, and counted in the summary bar.
- **Add / edit dialog** – the reason field is an editable dropdown
  (`Autocomplete freeSolo`) seeded with common business-trip reasons —
  type anything you like if none fit.
- **Local persistence** – the log is kept in `localStorage`, so a page
  refresh doesn't lose your data. There's no backend; CSV import and
  export are how you move data in and out.

A `sample-korjournal.csv` file is included in the project root to try
the import feature with a small, correctly-chained example.

## Tech stack

- React 18 + TypeScript
- Vite
- Material UI (MUI) v6
- PapaParse for CSV parsing/serialization

The Fetch API isn't currently exercised (there's no backend to talk
to), but the codebase has no dependency that would get in the way of
adding one later — e.g. swapping `localStorage` persistence for a
`fetch()`-based sync to a small API.

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

- **CSV import** – load an existing log with the columns `Date`,
  `Start ODO`, `Distance`, `Stop ODO`, `Reason`. Distance is always
  recomputed as `Stop ODO - Start ODO`; if the file's own `Distance`
  column disagrees, you get a warning but the recomputed value wins.
- **CSV export** – download the current log in the same column shape,
  ready to hand to your accountant or Skatteverket.
- **Chain validation** – every trip's `Start ODO` is checked against
  the previous trip's `Stop ODO` (in chronological order). Rows that
  don't chain up, or that have no reason, are flagged with a warning
  icon and tooltip in the table, and counted in the summary bar.
- **Add / edit dialog** – the `Start ODO` field is pre-filled with the
  last trip's `Stop ODO` for a new entry, distance is computed live,
  and the reason field is an editable dropdown (`Autocomplete
  freeSolo`) seeded with common business-trip reasons — type anything
  you like if none fit.
- **Local persistence** – entries are kept in `localStorage`, so a
  page refresh doesn't lose your data. There's no backend; CSV import
  and export are how you move data in and out.

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

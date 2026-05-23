# InclusiveJobs Backoffice (Frontend Demo)

Standalone admin UI — **fake data**, **Zustand local state**, **no API**.

## Run

```bash
cd backoffice
npm install
npm run dev
```

Open http://localhost:5174 → **Enter demo** on login screen.

## Features

- Login demo + protected routes
- Dashboard (KPIs, SVG trend chart, activity feed)
- Users (tabs, search, filters, pagination, modal, suspend)
- Jobs (filters, status actions, drawer detail)
- Applications (table + Kanban, match bars)
- Employers (cards, plan/status filters)
- Settings (EN/FR labels, light/dark/invert theme, compact sidebar)
- Toasts, modals, confirm dialogs, skeleton loading

## Structure

```
src/
  app/           Toast, ProtectedRoute
  components/ui/ Design system primitives
  components/layout/
  components/charts/
  features/      Page modules
  data/          Mock datasets + selectors
  store/         Zustand
  hooks/
  types/
  utils/
```

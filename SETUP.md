# Enterprise Components Showcase — Setup

## Prerequisites
- Node.js 18+
- npm 9+

## Install & Run
```bash
cd enterprise-showcase
npm install
npm run dev        # starts at http://localhost:5173
```

## Capture Screenshots
```bash
node screenshot.mjs
# saves to ./screenshots/
```

## Build for Production
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

Before the first deployment, a repository administrator must open
[Settings → Pages](https://github.com/AmrElsherif83/React-Enterprise-Components/settings/pages)
and select **GitHub Actions** under **Build and deployment → Source**.
The workflow's `GITHUB_TOKEN` can deploy to an existing Pages site, but cannot
enable Pages for the repository.

Push to `main` or manually run **Deploy to GitHub Pages** from the Actions tab.
The workflow checks the Pages configuration, builds the site, and deploys `dist`.
If deployment fails with HTTP 404 / “Ensure GitHub Pages has been enabled”,
verify the source setting above, then re-run the workflow.

## Stack
- Vite 8 + React 18 + TypeScript 5
- Tailwind CSS v4
- Playwright (screenshot capture only)
- No backend — all interactions are browser-side simulations

## Components

| # | Component | Key patterns |
|---|-----------|--------------|
| 01 | Dynamic Form Engine | Schema-driven, conditional fields, cross-field validation, draft persistence |
| 02 | High-Volume Data Grid | Virtual scroll (1000 rows), inline editing, unsaved-edit overlay, search/filter/sort |
| 03 | Conflict Resolution | ETag optimistic locking, field-level diff, merge resolution |
| 04 | Identity & Permissions | Multi-org RBAC, org-isolated data, MSAL/B2C integration pattern |
| 05 | Resumable Uploads | Chunked upload, pause/resume/retry, simulated failure recovery |
| 06 | Workflow Builder | SVG drag-and-drop, DFS cycle detection, undo/redo, publish validation |

## Notes
- All server behaviour (upload chunks, conflict detection, auth) is simulated in the browser
- Identity workspace uses hardcoded org data — no credentials required or used
- Screenshots are captured by Playwright against the live Vite dev server
- Described as newly built demonstrations, not historical client work

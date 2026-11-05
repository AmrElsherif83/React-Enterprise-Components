# React Enterprise Components

Six production-grade React + TypeScript component demos built by **Amr Elsherif, Solution Architect**.

**Live demo → https://amrelsherif83.github.io/React-Enterprise-Components/**

---

## Components

| # | Component | Highlights |
|---|-----------|------------|
| 1 | **Dynamic Form Engine** | JSON-schema driven, conditional sections, cross-field validation, draft persistence |
| 2 | **High-Volume Data Grid** | 1,000-row virtual scroll, inline editing, search / filter / sort |
| 3 | **Conflict Resolution** | ETag optimistic locking, field-level diff, per-field merge control |
| 4 | **Identity & Permissions** | Org switching, RBAC permission matrix, MSAL / Azure AD B2C wiring (simulated) |
| 5 | **Resumable Uploads** | Chunked upload, pause / resume / retry, connection-failure recovery |
| 6 | **Workflow Builder** | SVG drag-and-drop canvas, DFS cycle detection, undo / redo, publish validation |

Each demo includes a **View implementation** panel showing the relevant source code.

> All server behaviour is browser-simulated. No credentials are embedded.
> UI permissions are not a security boundary — backend authorization is required in production.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/React-Enterprise-Components/
```

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Lucide React

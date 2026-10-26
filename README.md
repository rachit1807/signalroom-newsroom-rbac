<div align="center">

# SignalRoom
### Independent minds. Connected.

A newsroom where every handoff matters — from the first draft to the public wire.

[Live website](https://signalroom-newsroom.onrender.com) · [Explore the source](https://github.com/rachit1807/signalroom-newsroom-rbac) · [Permission matrix](docs/rbac-matrix.md) · [Architecture](docs/architecture.md)

<img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,postgres,js,css,githubactions&theme=dark" alt="React, Vite, Node.js, Express, PostgreSQL, JavaScript, CSS, GitHub Actions" />

**Designed and built by Rachit Tripathi**

</div>

## The idea

SignalRoom turns role-based access control into a real editorial process. Reporters draft stories, editors independently approve a specific revision, and publishers release that approved snapshot. Readers see the public edition; internal feedback stays inside the newsroom.

An original red-and-navy visual system combines animated web strands, layered editorial artwork, cut-corner buttons, expressive typography, light/dark themes, and layouts that adapt to phones, tablets, and desktops. Motion respects the device’s reduced-motion preference. Fonts are served locally.

## Explore the workflow

1. Select **Explore the newsroom** for a private sample workspace.
2. As **Reporter**, start a story, write, save a revision, preview, and submit.
3. Switch to **Editor**, open the story, and approve its revision or request changes.
4. Switch to **Publisher** and publish the approved revision.
5. Open **The wire** to read the public snapshot. Add a correction or withdraw it as Publisher.
6. Switch to **Administrator** to inspect people and activity.

Each visitor’s demo is isolated. Demo personas cannot access real accounts. Demo workspaces are cleaned after 24 hours when the next demo request runs; they are not permanent storage. Register a real account to retain work outside the demo. New registrations always start as Reporter.

## Features

- Four roles with backend permission checks and role-aware interface controls.
- Separate author, reviewer, and publisher responsibilities; authors cannot approve or publish their own work.
- Revision history, optimistic conflict detection, editorial notes, review requests, and approval invalidation after edits.
- Published snapshots, correction notices, withdrawal, and an activity timeline.
- Search and section/status filters, reading preview, plain-text export, and unsaved-change prompts.
- Registration, sign-in/out, editable profile, password changes, and administrator role management.
- Signed HttpOnly session cookies, live role checks, session revocation, password hashing, request limits, and same-origin mutation checks.
- Responsive layouts, persistent light/dark preference, keyboard focus styles, labeled controls, and native modal dialogs.

## Run locally

Requires **Node.js 24+** and npm.

```sh
npm ci
cp .env.example .env
```

Replace `JWT_SECRET` in `.env` with at least 32 random characters. Leave `DATABASE_URL` empty to use the persistent local SQLite database in `.data/`.

```sh
npm run dev
```

Open **http://localhost:5173**. For the built application:

```sh
npm run build
npm start
```

Open **http://localhost:3020**. Never commit `.env` or `.data`.

## Real accounts and administration

Registration creates a Reporter. Create the first real administrator from a trusted terminal connected to the intended database:

```sh
npm run create-admin
```

The command prompts for a new administrator’s name, email, and password. It does not overwrite existing accounts. Sign in with that account, open **People**, and grant Editor or Publisher roles to other registered members. Role changes revoke that member’s current sessions. There are no default real-account passwords. Demo role switching applies only to isolated demo users.

## Deployment

One Node service serves the API and built React frontend. Set:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Secure cookies and production safeguards |
| `DATABASE_URL` | Dedicated PostgreSQL connection; TLS required by the provider |
| `JWT_SECRET` | Strong private signing secret, at least 32 characters |
| `PORT` | Assigned by the hosting platform |

Build with `npm ci && npm run build`; start with `npm start`. Health endpoint: `/api/health`. The hosted database is a separate Neon project rather than a temporary Render PostgreSQL instance. Hosting and database free-plan quotas still apply; no provider can guarantee indefinite free availability. Keep independent database backups and protect credentials.

## Verification

```sh
npm test
npm run build
npx playwright install chromium webkit
# Start the built app in another terminal first.
npm run test:e2e
```

Backend tests exercise denied privilege escalation, tenant boundaries, session revocation, revision conflicts, and publication/correction/withdrawal behavior. Browser checks exercise the full editorial handoff on desktop Chromium and mobile WebKit, theme persistence, horizontal overflow, and uncaught page errors. GitHub Actions runs these checks and retains browser evidence.

## Scope

This is a complete portfolio-scale RBAC application, not a large newspaper CMS. PostgreSQL stores transactional state in a single locked JSON document, which deliberately serializes writes. For substantial traffic, migrate to normalized tables, indexed queries, and granular transactions. Email verification, password recovery, file uploads, and scheduled publication are not implemented. Production operations require backups, monitoring, and an account-recovery process.

## License

MIT. Original SignalRoom branding and interface. No affiliation with Marvel or Microsoft. Dependency and font licenses remain with their respective owners.

# Delivery platform (working name)

> **Right now:** just run the **frontend** to see the three apps exactly as prototyped.
> You do NOT need the backend or Supabase for this step.
> ```
> cd frontend
> npm install
> npm run dev        # open http://localhost:5180, pick a role
> ```
> Wiring the backend + Supabase is the next phase (instructions further down).

A three-sided delivery platform: **user**, **merchant**, and **rider** apps over one shared backend,
plus a super admin. PWA first, wrapped to app stores later.

> Folder name `delivery-platform` is a placeholder — rename it once the `.app` name is chosen.

## Layout

```
delivery-platform/
├── backend/                 Node + TypeScript API (one server, all roles)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts         boot
│       ├── core/            the foundation — you rarely touch this
│       │   ├── app.ts
│       │   ├── config.ts
│       │   ├── events.ts    internal event bus (decouples features)
│       │   ├── logger.ts
│       │   ├── registry.ts  auto-loads every folder under modules/
│       │   └── types.ts     the module contract
│       └── modules/         EVERY feature is a folder here
│           └── health/      example/template module
└── frontend/                Vite + React + TS (one app, all roles)
    ├── vite.config.ts       dev on :5180, proxies /api -> :4000
    ├── index.html
    └── src/
        ├── App.tsx          picks role app by subdomain, else shows splash
        ├── Splash.tsx       "log in as user / rider / merchant" (option a)
        ├── lib/             role resolution + api client
        └── apps/            one folder per role (user, merchant, rider)
```

## How it grows (the important part)

The backend never gets edited inline to add features. A new feature is a **new folder**
under `backend/src/modules/`, with a `index.ts` that default-exports a module:

```ts
import type { AppModule } from '../../core/types';

const orders: AppModule = {
  name: 'orders',                 // mounts at /api/orders
  register({ router, events, log }) {
    router.post('/', (req, res) => { /* ... */ });
    events.on('order.created', (o) => { /* react */ });
  },
};

export default orders;
```

The registry finds it on boot and mounts it. You add code by adding modules — you don't
reopen the core or the other modules. Cross-feature reactions go through `events`, never
through direct edits.

The frontend mirrors this: each role app is a folder under `src/apps/`.

## Run it

Two terminals.

Backend (port 4000):
```
cd backend
cp .env.example .env      # then paste your Supabase connection string into DATABASE_URL
npm install
npm run dev
```
- On first boot with a valid `DATABASE_URL`, the auth module creates its tables automatically.
- `http://localhost:4000` -> `{ ok: true, service: 'delivery-backend' }`
- `http://localhost:4000/api/health` -> health module response

Frontend (port 5180):
```
cd frontend
npm install
npm run dev
```
- `http://localhost:5180` -> splash, pick a role to see its (stub) app.

## Build order

1. Foundation — this scaffold.
2. Shared: auth + accounts + splash/role-routing (device fingerprint + IP risk checks, biometric/passkey login).
3. **Merchant** app + its modules (profile, location, menu, order accept).
4. **User** app (consumes merchant catalogs).
5. **Rider** app + dispatch (closes the loop).

Domain shape (one `.app` domain, free subdomains): `name.app` (user), `rider.name.app`,
`merchant.name.app`, `admin.name.app`.

# Quickstart

## Requirements
- Node.js 18+
- npm 9+
- PostgreSQL 14+

## Install
```bash
npm install
```

## Environment
Create a `.env` at the repo root:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/neck_diagram
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
```

Notes:
- `DATABASE_URL` is required for the API.
- `CLIENT_ORIGIN` defaults to `http://localhost:5173` if unset.
- `PORT` defaults to `3001` if unset.
- The web app uses Vite’s dev proxy for `/api`; no `VITE_API_BASE` is needed in local dev.

## Database
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

## Dev Server
```bash
npm run dev
```
This starts both the API and the web app.

## Build
```bash
npm run build
```

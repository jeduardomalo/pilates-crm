# Pilates Studio CRM

A boutique CRM and management platform for a Pilates Studio.

## Features

- **Dashboard:** Overview of revenue, sessions, and active clients.
- **Class Log:** Log sessions with Quick Add functionality.
- **Schedule:** Plan upcoming classes and sync to Google Calendar (optional).
- **Client Management:** Track client history and Class Pack balances.
- **Reports:** Revenue analytics by location and class type.
- **Notifications:** Zero balance, low balance, and inactive client alerts.

## First-time setup (do it all)

### 1. Install dependencies

```bash
npm install
```

### 2. Database

**Option A – Docker (recommended)**

```bash
npm run db:up    # starts Postgres in the background
npm run db:push  # creates tables
npm run db:generate
```

**Option B – Existing Postgres**

Create a `.env` file (see `.env.example`) and set `DATABASE_URL` to your connection string, e.g.:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/your_db?connect_timeout=5"
```

Then:

```bash
npm run db:push
npm run db:generate
```

### 3. Environment

A `.env` file is included with defaults for the Docker Postgres (user `pilates`, password `pilates`, database `pilates_crm`). For auth and optional Google Calendar, set:

- `NEXTAUTH_SECRET` – required for login (use a long random string).
- `NEXTAUTH_URL` – e.g. `http://localhost:3000`.
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` for Schedule → Google Calendar.

### 4. Create admin user (required for login)

Create the first admin so you can sign in:

```bash
npm run create-admin
```

This creates an admin with default credentials:

- **Username:** `admin`
- **Password:** `admin123`

You can override them: `npm run create-admin [username] [password] [email] [name]`.  
Example: `npm run create-admin myuser mypass admin@studio.com "My Name"`.

**Important:** Change the default password after first login (e.g. run `create-admin` again with a new password).

### 6. Seed (optional)

If you have `data.csv` in the project root:

```bash
npm run db:seed
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

The app is set up to deploy from [GitHub](https://github.com/jeduardomalo/pilates-crm). After connecting the repo to Vercel, set these **Environment Variables** in the Vercel project:

- **`DATABASE_URL`** – PostgreSQL connection string (e.g. Neon, Supabase, or Vercel Postgres).
- **`NEXTAUTH_SECRET`** – A long random string (e.g. `openssl rand -base64 32`).
- **`NEXTAUTH_URL`** – Your production URL, e.g. `https://your-project.vercel.app`.
- **Google Calendar (optional):** To use “Connect” on the Schedule page, add **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`**, and **`GOOGLE_REDIRECT_URI`** (e.g. `https://your-domain.com/api/google/auth/callback`). Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and add the redirect URI there exactly.

Then run `npm run db:push` and `npm run create-admin` against your production DB so the schema and admin user exist. Redeploy after adding env vars if needed.

## Scripts

| Script         | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start Next.js dev server       |
| `npm run db:up`| Start Postgres (Docker)        |
| `npm run db:push` | Apply Prisma schema to DB   |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed from `data.csv`        |
| `npm run create-admin` | Create/update admin user (default: username `admin`, password `admin123`) |
| `npm run setup`| db:up + db:push + db:generate   |

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth v5 (optional)

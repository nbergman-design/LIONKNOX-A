# Deal Pipeline — Phase 1 MVP

A focused deal pipeline management tool modeled after AppFolio Investment Manager.

## Tech Stack

- **Framework**: Next.js 14 (App Router) — TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (credentials / email+password)
- **Styling**: Inline CSS (no extra CSS framework needed for MVP)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a free [Neon](https://neon.tech) cloud DB)

### 2. Clone & Install

```bash
git clone <your-repo>
cd deal-pipeline
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL + NEXTAUTH_SECRET
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 4. Database Setup

```bash
# Run migrations (creates all tables)
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed pipeline stages + admin user
npm run db:seed
```

Default admin credentials after seed:
- Email: `admin@example.com`
- Password: `admin123`

### 5. Run Dev Server

```bash
npm run dev
# Open http://localhost:3000/deals
```

---

## Project Structure

```
deal-pipeline/
├── prisma/
│   ├── schema.prisma          # DB schema (deals, users, status_history)
│   └── seed.ts                # Pipeline stages + admin user
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── deals/
│   │   │       ├── route.ts           # GET list + POST create
│   │   │       ├── [id]/
│   │   │       │   ├── route.ts       # GET/PATCH/DELETE single deal
│   │   │       │   └── status/route.ts# PATCH move status (writes history)
│   │   │       ├── import/route.ts    # POST CSV import
│   │   │       └── stats/route.ts     # GET pipeline summary stats
│   │   └── (dashboard)/deals/
│   │       ├── page.tsx               # Table + Kanban view
│   │       └── [id]/page.tsx          # Deal detail + edit + history
│   └── lib/
│       ├── prisma.ts                  # Prisma singleton
│       ├── csvParser.ts               # Handles --, $currency, M/D/YY dates
│       └── formatters.ts              # Currency/date/percent display utils
├── package.json
└── .env.example
```

---

## CSV Import Format

Column headers must match exactly (case-insensitive):

```
Deal, Type, Status, Deal Owner, Strategy, City, State, Asset Type,
Closing Date, Square Feet, Rentable SF, Price Per SF, Land Acres,
Units, Price Per Unit, Asking Price, Funds Needed, Cap Rate
```

- `--` or empty cell = null/blank
- Currency: `$21,306,050` → stored as integer cents
- Date: `6/1/26` or `6/1/2026`
- Cap Rate: `5.5%` or `0.055`

---

## Pipeline Stages (in order)

| Stage | Probability |
|-------|-------------|
| New | 10% |
| Under Review | 20% |
| LOI Submitted | 35% |
| LOI Accepted | 50% |
| Due Diligence | 65% |
| Under Contract | 80% |
| Closed | 100% |
| Lost / Dead | 0% |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List deals (filters: status, type, asset_type, state, search) |
| POST | `/api/deals` | Create deal |
| GET | `/api/deals/:id` | Get deal + status history |
| PATCH | `/api/deals/:id` | Update deal fields |
| DELETE | `/api/deals/:id` | Soft-delete deal |
| PATCH | `/api/deals/:id/status` | Move to new status (writes history) |
| POST | `/api/deals/import` | Import CSV file |
| GET | `/api/deals/stats` | Summary stats for dashboard cards |

---

## Phase 2 Roadmap (not in scope yet)

- Investor portal + distributions
- Document attachments (S3)
- Email notifications on status change
- Deal memo / notes (rich text)
- Multi-tenancy / organizations
- Advanced reporting & export

# Atelier ERP — Demo Data Seeding Guide

The `seed/` folder contains a standalone Node.js script that populates your Supabase database with realistic Moroccan workshop demo data. It is completely independent of the frontend and requires no build step.

---

## What gets seeded

| Table              | Records | Notes                                            |
|--------------------|---------|--------------------------------------------------|
| `clients`          | 10      | Moroccan clients across Casablanca, Marrakech… |
| `workers`          | 8       | Craftsmen with task prices & payment status      |
| `suppliers`        | 8       | Wood, fabric, hardware, paint suppliers          |
| `products`         | 20      | Raw materials + finished furniture               |
| `stock_movements`  | 24      | IN/OUT history explaining current quantities     |
| `orders`           | 10      | All statuses: pending → delivered + cancelled    |
| `quotes`           | 10      | draft, sent, accepted, rejected, converted       |
| `invoices`         | 10      | paid, partial, unpaid — with payment_history     |
| `expenses`         | 15      | Dec 2025 – Apr 2026 (rent, salary, materials…)  |
| `history`          | 25      | Activity log covering all modules                |
| `company_settings` | 1       | "Atelier Bois & Design", Casablanca              |

---

## Required environment variables

| Variable                    | Where to find it                                              |
|-----------------------------|---------------------------------------------------------------|
| `SUPABASE_URL`              | Supabase Dashboard → Project Settings → API → Project URL    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role   |

> **Security:** The service role key bypasses Row Level Security and can read/write everything. Never put it in frontend code or commit it to git.

---

## Setup

```bash
# 1. Enter the seed folder
cd seed

# 2. Install dependencies (one-time)
npm install

# 3. Create your .env file
cp .env.example .env
# Then edit .env and fill in your two values
```

Your `seed/.env` should look like:

```
SUPABASE_URL=https://jdwoxceqhgmgvmwjsbdr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Running the seed

```bash
# From inside the seed/ folder:

# Seed (safe to run multiple times — upserts stable data, refreshes history/stock)
npm run seed

# Full reset: wipes all demo data, then re-inserts everything cleanly
npm run seed:reset
```

Both commands leave any non-demo data (data you created manually through the app) untouched, because all demo records use fixed UUIDs that begin with `c0000000`, `a0000000`, `b0000000`, etc.

---

## How idempotency works

- **Stable tables** (clients, workers, suppliers, products, orders, quotes, invoices, expenses, company_settings): use `upsert` with the demo's fixed UUIDs. Running `seed` twice is safe — the second run just updates the same rows.
- **Non-stable tables** (history, stock_movements): have no fixed IDs. Before each seed run, these are cleaned by:
  - `history` rows where `user_name = 'Atelier Admin'`
  - `stock_movements` rows where `product_id` is one of the 20 demo product IDs

---

## Verifying data in Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → your project
2. Click **Table Editor** in the left sidebar
3. Check each table — you should see the demo rows

Or use the SQL Editor:
```sql
SELECT count(*) FROM clients;
SELECT count(*) FROM products;
SELECT count(*) FROM history;
```

---

## Verifying data in your Netlify app

1. Open your deployed Netlify URL
2. Log in with the admin account you created in Supabase Auth
3. Check each page:

| Page        | What to look for                                              |
|-------------|---------------------------------------------------------------|
| Dashboard   | Revenue chart populated, stats cards with numbers            |
| Clients     | 10 clients listed                                            |
| Orders      | 10 orders across all statuses                                |
| Quotes      | 10 devis across draft/sent/accepted/rejected/converted       |
| Invoices    | 10 factures — some paid, some partial, some unpaid           |
| Stock       | 20 products — 2 low-stock alerts (Mousse HR40, Fauteuil)     |
| Craftsmen   | 8 workers — mix of paid, partial, unpaid                     |
| Suppliers   | 8 suppliers — some with outstanding balance                  |
| Finance     | 15 expense entries with pie chart                            |
| History     | 25 activity entries across all modules                       |
| Settings    | Company pre-filled as "Atelier Bois & Design"                |

---

## Resetting to a clean slate

```bash
npm run seed:reset
```

This deletes only the demo rows (by their fixed UUIDs and the `'Atelier Admin'` user_name marker), then re-inserts them. Any data you added manually through the app is not touched.

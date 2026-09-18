# PressWala — Ironing Vendor Order & Payment Tracker (PWA)

A responsive, zero-cost Progressive Web App (PWA) designed for local cloth-ironing ("dhobi") vendors and apartment residents. It replaces informal WhatsApp messaging with an organized, error-proof order tracker and payment register.

---

## Key Features

- **Customer Portal (Resident)**:
  - Simple Flat Number + 4-digit PIN authentication (zero SMS/gateway costs).
  - Create Order: Visual garment selection with real-time price calculation.
  - My Orders: Track status through the 4-stage lifecycle (`Created` → `In Progress` → `Ready` → `Delivered`).
  - Payment Summary: Instant view of total paid vs. outstanding balance, with one-tap UPI payment trigger.
- **Vendor Portal (Dhobi)**:
  - Metric Dashboard: At-a-glance counts for *New Orders*, *In Progress*, *Completed Today*, and *Total Outstanding Dues*.
  - Order Management: Filter by Flat Number or Status, with quick actions to advance clothes through `In Progress` and `Ready`.
  - **Mandatory Delivery Payment Prompt**: When marking an order `Delivered` at the doorstep, the app prompts the vendor to record whether payment was collected (`Cash` / `UPI`) or left `Unpaid (Collect Later)`. It cannot be silently skipped, ensuring unpaid clothes never get forgotten.
  - Outstanding Dues Ledger: View all unpaid balances, send pre-filled WhatsApp reminders in 1 click, and mark payments collected later.
  - Customer Directory & Price List Editor: Maintain resident profiles and adjust garment prices on the fly.
- **Dual-Storage Engine**:
  - Runs out of the box with persistent local storage (seeded with realistic apartment data).
  - Connects to Supabase PostgreSQL in real-time when environment variables are set.

---

## 4-Stage Lifecycle Flow

```
[Created] ──(Vendor Picks Up)──> [In Progress] ──(Ironing Done)──> [Ready] ──(Doorstep Delivery)──> [Delivered]
                                                                                                        │
                                                                                [Mandatory Payment Prompt Modal]
                                                                                ├── Paid (Cash or UPI)
                                                                                └── Unpaid (Flagged in Outstanding)
```

---

## Quickstart & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd presswala
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
Open `.env` and optionally enter your free Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APARTMENT_NAME="Palm Heights Apartments"
VITE_VENDOR_NAME="Ramu Dhobi"
VITE_VENDOR_PHONE="9876543210"
VITE_VENDOR_UPI_ID="dhobi@upi"
```
*(If left empty, the app runs in full Offline-First mode with simulated persistence).*

### 3. Database Migration (for Supabase)
To provision the PostgreSQL schema and enforce Row Level Security on your Supabase project:
1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql` to create core tables (`orders`, `order_items`, `payments`, `garment_types`, `users`) and catalog seeds.
4. Run `supabase/migrations/002_row_level_security.sql` to establish the `profiles` table, automated auth trigger, and Row Level Security (RLS) policies across all tables.

### 4. Security & Mobile-First Architecture
- **Real Supabase Auth Under the Hood**: Residents and vendors continue using simple Flat + PIN logins, while the system transparently creates real Supabase Auth sessions (`flat-<flat>@presswala.internal` / `vendor@presswala.internal`) and binds them to `auth.uid()` for database-level RLS enforcement.
- **Granular Row Level Security**: Residents can only query/insert their own flat's orders and items; only the vendor role can update order statuses or insert payment records.
- **PIN Brute-Force Lockout**: Automatically blocks attempts after 5 consecutive failures for any flat or vendor key, enforcing a 3-minute cooldown with live timer display.
- **PWA & Mobile Ready**: Tested for 375px+ viewports, thumb-friendly touch targets (≥44px), iOS Apple touch icon tags, and Service Worker offline caching.

### 5. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:5173` on your browser or mobile phone on the same Wi-Fi.

---

## Deployment (Vercel / Netlify)

This repository is pre-configured for zero-configuration static deployment:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your Vercel or Netlify project settings.

---

## Default Demo Credentials

- **Resident (Customer)**:
  - Flat: `A-101` | PIN: `1010` (Sharma Ji)
  - Flat: `A-204` | PIN: `2040` (Pooja Verma — has ₹110 outstanding order)
  - Flat: `B-302` | PIN: `3020` (Karthik Raja)
- **Vendor**:
  - Login Key: `VENDOR` or `9876543210` | PIN: `1234`

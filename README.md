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
- **Vendor Onboarding**:
  - Includes a printable, step-by-step handbook: [docs/VENDOR_QUICK_GUIDE.md](docs/VENDOR_QUICK_GUIDE.md).

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
5. Run `supabase/migrations/003_remove_pin_hash.sql` to strip the `pin_hash` column from the public `users` table and install the vendor-authorized resident password reset RPC.

### 4. Security & Mobile-First Architecture
- **Zero Plaintext Secrets**: Passwords and PINs are never stored in application tables (`users`, `profiles`) or client storage. Credentials reside solely in Supabase's hardened `auth.users` table with bcrypt encryption.
- **Strictly Authoritative Auth**: Login decisions defer completely to Supabase Auth (`signInWithPassword()`). If Supabase reports invalid credentials, login is blocked immediately without falling back to local state.
- **Vendor-Assisted Account Recovery**: Insecure client-side OTP flows are eliminated. Account resets are verified and triggered directly by the vendor via a PostgreSQL `SECURITY DEFINER` RPC (`vendor_reset_resident_password`).
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

## Default Demo Credentials (Public App & Local Development)

> [!WARNING]
> The accounts below are pre-seeded for development, staging, and offline evaluation only. In a production deployment connected to a live Supabase database, these credentials MUST be rotated or deleted before inviting real residents and vendors.

- **Platform Owner (Restricted route `/platform-admin`)**:
  - Key / Mobile: `SUPER_OWNER_KEY` or `9800000001`
  - Password: `PressWala!Ops#2026` (or `PressWala!Owner#2026`)
  - Status: `active`
- **Vendors**:
  - **Palm Heights Apartments**: `VENDOR` or `9876543210` | PIN: `1234` (Ramu Dhobi — status: `active`)
  - **Royal Palms Residency**: `VENDOR-SURESH` or `9876543211` | PIN: `1234` (Suresh Laundry — status: `pending` approval)
  - **Test Vendor**: `9876522222` (Apex Ironing Hub — used in automated invite onboarding tests)
- **Residents (Palm Heights Apartments)**:
  - Flat: `A-1001` (or `A-101`) | PIN: `1010` (Sharma Ji — active, dues: ₹54, 3 phone numbers)
  - Flat: `A-2004` (or `A-204`) | PIN: `2040` (Pooja Verma — active, dues: ₹110)
  - Flat: `B-3002` (or `B-302`) | PIN: `3020` (Karthik Raja — active, dues: ₹0)
  - Flat: `C-4005` | PIN: `4005` (Ananya Patel — active, dues: ₹0)

---

## 🔒 Production Security & Dedicated Platform Admin Notice

> [!CAUTION]
> **CRITICAL SECURITY CHECKLIST BEFORE LIVE PRODUCTION DEPLOYMENT:**
> 
> 1. **Hidden Route Isolation**: The Platform Owner operations console is isolated from the public resident and vendor app and is accessible **strictly** via the dedicated, unlinked route `/platform-admin`. It is excluded from all public navigation, footer links, sitemaps, and indexing via `robots.txt`.
> 2. **Immediate Owner Credential Rotation**: The temporary bootstrap owner seed account (`SUPER_OWNER_KEY` / `9800000001`) MUST have its password rotated immediately upon live deployment before onboarding vendors or residents.
> 3. **Demo Account Removal / Truncation**: When provisioning your live Supabase database:
>    - Remove demo vendors (`VENDOR-SURESH`, `Apex Ironing Hub`) from `public.users` and `auth.users`.
>    - Remove demo residents (`A-1001`, `A-2004`, `B-3002`, `C-4005`) if starting with a clean slate.
>    - If preserving initial garment types catalog, ensure prices match the local vendor's actual rate sheet.
> 4. **No Silent Re-seeding in Production**:
>    - The client-side database initializer (`initializeDatabase()`) only runs against the browser's `localStorage` in offline/local-first mode; it **never** writes demo seed accounts to a remote Supabase database.
>    - The remote provisioning migrations utilize idempotent constraints (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), preventing accidental overwriting of existing production user passwords or operational records.
>    - The setup script (`scripts/setup-db.js`) requires explicit administrative invocation and never runs automatically during client-side builds or runtime.


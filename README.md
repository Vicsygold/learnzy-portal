# Learnzy Hub

Phase 1 foundation for a production-ready Nigerian school management platform.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 notes

- Next.js App Router, TypeScript, Tailwind CSS and ESLint are configured.
- The public landing page establishes the mobile-first visual system and initial routes (`/login` and `/admissions` are reserved for later phases).
- Public inspection of `https://www.educare.school/` observed a React single-page bundle and product metadata describing school/business ERP capabilities. REA static analysis reached the bundle but stopped when its JavaScript worker exhausted its 1 GB heap; feature-level implementation claims are therefore not treated as verified.
- `http://educare.school/` redirected to an unrelated `omg10.com` URL during inspection. Use HTTPS for the official public site.

## Database setup

Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL database:

```bash
copy .env.example .env
npm run db:migrate -- --name init
npm run db:seed
```

For local Docker development, use the included PostgreSQL service:

```bash
npm run db:up
npm run db:migrate -- --name init
npm run db:seed
```

The local server must be restarted after creating `.env` so Next.js loads `DATABASE_URL`.

For production deployment, run `npm run db:migrate:deploy` against the production
database before starting the application. Do not run the seed command against a
production database.

The seed creates one demo school, three classes, ten students, three teachers, two parents, sample fees and payments. The demo administrator is:

```text
Email: admin@educare.demo
Password: Educare123!
```

Do not use the demo password in production.

## Phase 2 notes

- Prisma 6.19.0 is pinned for a stable migration workflow.
- The schema covers school settings, users and roles, academic sessions and terms, classes and arms, subjects, students, guardians, staff, attendance, results, fees, payments, assignments, timetable entries, admissions, announcements, messaging and audit logs.
- Database migration requires a reachable PostgreSQL instance; schema validation and client generation do not require a live database.

## Authentication

Phase 3 adds database-backed sessions and role-aware server helpers:

- `POST /api/auth/login` validates input with Zod and verifies bcrypt password hashes.
- Sessions use random 256-bit tokens stored as SHA-256 hashes in PostgreSQL.
- Session cookies are `HttpOnly`, `SameSite=Lax`, path-scoped and secure in production.
- `/dashboard` requires an active session and redirects unauthenticated users to `/login`.
- `requireUser()` and `requireRole()` are available for server actions and API routes.
- `POST /api/auth/logout` revokes the current session.

The login flow requires a migrated database and seeded user. The demo credentials are listed above.

## Student management

Phase 4 adds:

- Protected student list at `/dashboard/students`
- Role checks for super admins, admins, bursars and teachers
- Student creation form at `/dashboard/students/new`
- `GET /api/students` with search, pagination and page-size limits
- `POST /api/students` with Zod validation
- Automatic admission numbers in the `EDU/YYYY/0001` format
- Audit log entries for student creation
- Class/status display and responsive table layout

## Staff and academic administration

Phase 5 adds:

- Academic overview at `/dashboard/academics`
- Staff creation at `/dashboard/staff/new`
- `GET /api/academics` for classes, arms, subjects and staff assignments
- `POST /api/academics` for classes, arms and subjects
- `GET /api/staff` for staff records
- `POST /api/staff` for protected staff creation
- Automatic staff numbers in the `STF/001` format
- Teacher, bursar and admin roles
- Temporary password handling for newly created staff
- Role checks on every API route

New staff receive the temporary password `ChangeMe123!`; this must be replaced with a password-reset flow before production use.

## Attendance and results

Phase 6 adds:

- Attendance API at `/api/attendance`
- Attendance status validation for present, absent, late and excused
- Term/date upsert behavior to prevent duplicate daily records
- Attendance retrieval filtered by term or student
- Results API at `/api/results`
- CA1, CA2 and exam score validation
- Configurable score weights, defaulting to 20/20/60
- A1-F9 grade calculation and remarks
- Teacher submission status
- Admin approval, publication and draft transitions
- Protected result visibility by role
- Attendance overview at `/dashboard/attendance`
- Results overview at `/dashboard/results`

The calculation helpers are in [src/lib/results.ts](./src/lib/results.ts).

## Fees and payments

Phase 7 adds:

- Finance dashboard at `/dashboard/fees`
- `GET /api/fees` for fee structures and payment history
- `POST /api/fees` for protected fee-structure creation
- Paystack checkout initialization at `/api/payments/initialize`
- Amount conversion from Naira to kobo
- Unique payment references
- Paystack webhook at `/api/payments/webhook`
- HMAC-SHA512 webhook signature verification
- Idempotent successful-payment handling
- Payment audit log entries
- Finance role restrictions

Configure these values in `.env` before using live checkout:

```env
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
```

The webhook endpoint must be configured in Paystack as:

```text
https://your-domain.example/api/payments/webhook
```

## Student portal integration

The student dashboard at `/dashboard` now reads the signed-in student's records directly from PostgreSQL:

- Attendance rate for the current term
- Published-result average
- Current-term fee balance and paid amount
- Class assignments
- Today's timetable entries
- Recent school announcements
- Student-specific profile and class information

The seeded student account is `student1@educare.demo` with password `Educare123!`. The dashboard queries are intentionally sequential because the configured Supabase pool may expose a single database connection.

For a Supabase transaction pool, use `pgbouncer=true&connection_limit=1&pool_timeout=30` in
`DATABASE_URL`. The pool timeout allows short concurrent browser requests to wait for the
single available connection instead of failing after Prisma's default 10-second timeout.

## PDF documents

The portal now provides protected server-generated PDFs:

- Student report cards at `/api/reports/[studentId]`
- Payment receipts at `/api/receipts/[paymentId]`

Students and parents can only download documents for themselves or their linked
children. Administrators, teachers, and bursars can access the documents allowed
by their role. The results and fees pages expose the relevant download links.

Paystack checkout remains available in the codebase but is intentionally deferred
until payment credentials and a public HTTPS webhook URL are configured.

## Paystack checkout

The fees page now provides a parent-only Paystack checkout button. Parents select
a linked child and matching fee, enter their email, and are redirected to the
Paystack authorization page. The server creates a pending payment and verifies
the parent-child and class-fee relationship before initialization.

Use test keys during development:

```env
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
```

Configure the webhook at `/api/payments/webhook`. A public HTTPS URL is required
for Paystack to deliver live webhook events.

## Password reset

Users can request a password reset from `/forgot-password`. Reset tokens are
stored hashed, expire after one hour, and invalidate all existing sessions after
the password is changed. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and
`NEXTAUTH_URL` for email delivery.

## Security hardening

The application applies same-origin checks to browser state-changing requests,
rate limits login, password reset, admission, and upload-signature endpoints,
handles malformed webhook JSON safely, and only accepts HTTPS Cloudinary URLs for
stored assignment attachments. Production deployments use Upstash Redis for
shared rate limiting; set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`. Vercel KV integrations are also supported through
`KV_REST_API_URL` and `KV_REST_API_TOKEN`. Local development uses an in-memory
limiter when `NODE_ENV` is not `production`.

# Cyber Café Management System

A web application for managing a cyber café: customer sessions, billing, services, payments and reports.

**Roles:** `admin`, `staff`. No customer login.  
**Currency:** INR (₹). All datetimes stored in UTC; frontend displays local time.

---

## Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+
- **npm** 9+

---

## Backend Setup

### 1. Create the database

Open MySQL CLI (or MySQL Workbench) and run:

```sql
source /path/to/cybercafe/database/schema.sql
```

Or using the mysql CLI tool:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your MySQL password and any other values.

### 3. Install dependencies

```bash
cd backend
npm install
```

### 4. Seed the database

```bash
npm run seed
```

Default logins after seed:

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | admin |
| staff1   | staff123 | staff |

### 5. Start the backend

```bash
npm run dev       # Development (nodemon)
# or
npm start         # Production
```

Backend runs at: `http://localhost:5000`  
API prefix: `/api`  
Health check: `GET /api/health`

### 6. Run tests

Ensure the database is seeded before running tests.

```bash
npm test
```

---

## Frontend Setup (Phase 2)

> Frontend is built in Phase 2. Instructions will be added here.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Current user |
| `/api/users` | GET/POST/PUT/DELETE | Staff management (admin only) |
| `/api/customers` | GET/POST/PUT/DELETE | Customer CRUD |
| `/api/stations` | GET/POST/PUT/DELETE | Station management |
| `/api/services` | GET/POST/PUT/DELETE | Services & stock |
| `/api/sessions` | GET/POST | Sessions |
| `/api/sessions/active` | GET | Active sessions with live charges |
| `/api/sessions/:id/services` | POST/DELETE | Add/remove services |
| `/api/sessions/:id/end` | POST | End session, create bill |
| `/api/bills` | GET | Bills list |
| `/api/bills/:id` | GET | Bill detail (invoice) |
| `/api/bills/:id/pay` | POST | Record payment |
| `/api/bills/:id/void` | POST | Void bill (admin only) |
| `/api/reports/dashboard` | GET | Dashboard stats |
| `/api/reports/revenue` | GET | Revenue report |
| `/api/reports/utilization` | GET | Station utilization |
| `/api/reports/top-customers` | GET | Top customers |
| `/api/reports/export` | GET | CSV export |

---

## Billing Rules

- **Block size:** 15 minutes (configurable in `settings` table)
- **Billed minutes:** `max(blockMinutes, ceil(elapsed / blockMinutes) * blockMinutes)`
- **Time charge:** `billedMinutes × hourlyRate / 60`
- **Bill number format:** `CC-YYYYMMDD-NNNN` (daily sequence)

| Elapsed | Billed | Time Charge (₹30/hr) |
|---------|--------|----------------------|
| 1 min   | 15 min | ₹7.50                |
| 15 min  | 15 min | ₹7.50                |
| 16 min  | 30 min | ₹15.00               |
| 60 min  | 60 min | ₹30.00               |
| 61 min  | 75 min | ₹37.50               |
| 90 min  | 90 min | ₹45.00               |

---

## Assumptions

1. The `billing_block_minutes` setting defaults to 15 if missing from the `settings` table.
2. Soft delete is used for users, customers, and services (`is_active = 0`). Hard delete is used for stations (only if no session history).
3. Discounts are clamped between 0 and (time_charge + service_charge).
4. A voided bill is excluded from revenue reports; it does not reverse stock.
5. The `sessions.test.js` integration test runs against the dev database (seeded) and performs cleanup without removing seed data.
6. Phone numbers must be exactly 10 digits (Indian format).

---

## Project Structure

```
cybercafe/
├── README.md
├── database/
│   └── schema.sql
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/billing.js
│   │   ├── utils/response.js
│   │   └── scripts/seed.js
│   └── tests/
│       ├── billing.test.js
│       └── sessions.test.js
└── frontend/          ← Phase 2
```

---

## Known Limitations

- No customer login/portal
- No real payment gateway integration
- No pause/resume sessions
- No multi-branch support
- No email/SMS notifications
- Timers in active sessions are computed client-side, corrected by server_time offset

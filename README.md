# ☕ Cyber Café Management System

A full-stack web application for managing a cyber café — handling computer sessions, billing, bookings, print orders, inventory, and reporting — all from a single dashboard.

> **Stack:** React 18 + Vite · Node.js + Express 5 · MySQL 8 · JWT Auth  
> **Currency:** INR (₹) · **Roles:** `admin`, `staff` · **Public portal:** No login required

---

## ✨ Features

| Module | Highlights |
|---|---|
| **Session Management** | Start/end PC sessions, add services mid-session, live running cost timer |
| **Billing & Payments** | Auto-generated bills, counter/walk-in sales, cash/UPI/card payment recording, invoice print |
| **Station Bookings** | Customer self-booking via public portal, staff approval & check-in workflow, no-show auto-expiry |
| **Print Orders** | File upload (PDF, Word, Excel, images), color/B&W options, 5-stage status workflow, auto-billing on completion |
| **Customer Portal** | Public-facing page — book a station, submit a print job, track status (no login required) |
| **Inventory & Services** | Stock tracking, low-stock alerts, service add/remove during sessions |
| **Reports & Analytics** | Revenue charts, station utilization, top customers, CSV export |
| **User Management** | Admin manages staff accounts; role-based access control throughout |

---

## 🗂️ Project Structure

```
cyber-cafe/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app, middleware, routes
│   │   ├── server.js               # HTTP server, process guards
│   │   ├── config/db.js            # MySQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verify, requireRole
│   │   │   ├── errorHandler.js     # Global error + multer handler
│   │   │   └── validate.js         # express-validator wrapper
│   │   ├── controllers/            # Route handlers (one per module)
│   │   ├── routes/                 # Express routers
│   │   ├── services/billing.js     # Billing engine (block rounding, charges)
│   │   ├── utils/
│   │   │   ├── billHelper.js       # Shared bill detail builder
│   │   │   └── response.js         # ok() / fail() helpers
│   │   └── scripts/
│   │       ├── schema.sql          # Base schema (7 core tables)
│   │       ├── migrate_v2.js       # V2 migration (bookings, print_orders, bill_items)
│   │       ├── seed.js             # Default users, stations, services, customers
│   │       └── checkSecrets.js     # Pre-commit secret scanner
│   ├── uploads/printouts/          # Uploaded print files (gitignored)
│   ├── tests/                      # Jest + Supertest integration tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Routes, lazy loading, ErrorBoundary
│   │   ├── api/axios.js            # Axios instance, 401 interceptor
│   │   ├── context/AuthContext.jsx # Auth state, login/logout
│   │   ├── components/             # Layout, Spinner, Toast, LiveTimer, etc.
│   │   ├── pages/                  # One component per route
│   │   └── utils/format.js         # Currency, datetime, timer formatters
│   ├── .env.example
│   └── package.json
├── vercel.json                     # Deployment config (backend + frontend)
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+
- **npm** 9+

---

### 1 · Database Setup

Create the database and run the base schema:

```bash
mysql -u root -p -e "CREATE DATABASE cybercafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p cybercafe < backend/src/scripts/schema.sql
```

Then apply the V2 migration (adds bookings, print_orders, bill_items tables):

```bash
node backend/src/scripts/migrate_v2.js
```

---

### 2 · Backend

```bash
cd backend
cp .env.example .env        # Then edit .env with your DB credentials
npm install
npm run seed                # Seed default users, stations, services
npm run dev                 # Development server (nodemon, port 5000)
```

> **Production:** `npm start`

---

### 3 · Frontend

```bash
cd frontend
cp .env.example .env        # Set VITE_API_URL if needed
npm install
npm run dev                 # Vite dev server (port 5173)
```

> **Production build:** `npm run build`

---

### 4 · Default Login Credentials

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `admin123` | Admin |
| `staff1` | `staff123` | Staff |

> ⚠️ Change these immediately in a production environment.

---

## 🧪 Running Tests

Ensure the database is seeded before running tests (tests use the dev database):

```bash
cd backend
npm test
```

**Test coverage:** 46 tests across 4 test files — billing logic (unit), sessions, bookings & print orders, and counter billing (integration via Supertest).

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | _(empty)_ |
| `DB_NAME` | Database name | `cybercafe` |
| `DB_SSL` | Enable SSL for DB | `false` |
| `JWT_SECRET` | JWT signing secret | _(fallback key — **set this**)_ |
| `JWT_EXPIRES_IN` | Token expiry duration | `8h` |
| `PORT` | API server port | `5000` |
| `CORS_ORIGIN` | Allowed CORS origin(s) | _(reflects all — set for production)_ |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `/api` (production) |

---

## 🗺️ Pages & Routes

| Route | Page | Access | Description |
|---|---|---|---|
| `/portal` · `/book` | Customer Portal | **Public** | Self-service: book a station, submit print job, track status |
| `/login` | Login | **Public** | Staff / admin login |
| `/` | Dashboard | All staff | KPIs, active sessions count, today's revenue, station grid |
| `/stations` | Stations | All staff | Station list; admin can add, edit, delete, set maintenance |
| `/sessions` | Active Sessions | All staff | Live session cards with running cost timer; counter sale |
| `/bookings` | Bookings & Print Queue | All staff | Manage station bookings + print order workflow in one view |
| `/customers` | Customers | All staff | Customer records, search, visit count |
| `/bills` | Bills | All staff | Paginated bill list; pay, void (admin), counter sale |
| `/bills/:id` | Invoice | All staff | Full invoice detail; printable via browser |
| `/services` | Services & Stock | All staff | Service list with low-stock badges; admin can manage |
| `/reports` | Reports | **Admin only** | Revenue chart, utilization table, top customers, CSV export |
| `/staff` | Staff Management | **Admin only** | Create / edit / deactivate user accounts |

---

## 🌐 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login, returns JWT |
| `GET` | `/api/auth/me` | Token | Current user profile |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `POST` | `/api/users` | Admin | Create user |
| `PUT` | `/api/users/:id` | Admin | Update user |
| `DELETE` | `/api/users/:id` | Admin | Deactivate user (soft delete) |

### Customers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/customers` | Staff | Paginated list with search |
| `POST` | `/api/customers` | Staff | Create customer |
| `GET` | `/api/customers/:id` | Staff | Customer detail |
| `PUT` | `/api/customers/:id` | Staff | Update customer |
| `DELETE` | `/api/customers/:id` | Staff | Deactivate customer |

### Stations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/stations` | Public | Station list (includes virtual `reserved` status) |
| `POST` | `/api/stations` | Admin | Create station |
| `PUT` | `/api/stations/:id` | Admin | Update station |
| `PATCH` | `/api/stations/:id/status` | Staff | Set available / maintenance |
| `DELETE` | `/api/stations/:id` | Admin | Delete station (blocked if has session history) |

### Services
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/services` | Staff | List active services with low-stock flag |
| `POST` | `/api/services` | Admin | Create service |
| `PUT` | `/api/services/:id` | Admin | Update service / toggle active |
| `DELETE` | `/api/services/:id` | Admin | Deactivate service |

### Sessions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sessions/active` | Staff | Live sessions with running charges + `server_time` |
| `POST` | `/api/sessions` | Staff | Start session |
| `GET` | `/api/sessions` | Staff | Session history |
| `POST` | `/api/sessions/:id/services` | Staff | Add service (decrements stock) |
| `DELETE` | `/api/sessions/:id/services/:rowId` | Staff | Remove service (restores stock) |
| `POST` | `/api/sessions/:id/end` | Staff | End session, generate bill |

### Bills
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bills` | Staff | Paginated bill list |
| `POST` | `/api/bills/counter` | Staff | Counter/walk-in sale (no session) |
| `GET` | `/api/bills/:id` | Staff | Bill detail with line items |
| `POST` | `/api/bills/:id/pay` | Staff | Record payment (cash / UPI / card) |
| `POST` | `/api/bills/:id/void` | Admin | Void bill |

### Bookings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings/available-slots` | Public | Hourly availability grid for a station + date |
| `GET` | `/api/bookings/track` | Public | Track booking by code or phone (name masked) |
| `POST` | `/api/bookings` | Public | Create booking (portal: always `pending`) |
| `POST` | `/api/bookings/:id/cancel` | Public | Cancel pending / confirmed booking |
| `GET` | `/api/bookings` | Staff | List bookings with filters |
| `POST` | `/api/bookings/:id/checkin` | Staff | Check in customer, start session |
| `PATCH` | `/api/bookings/:id/status` | Staff | Update booking status |

### Print Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/print-orders` | Public | Submit print job (multipart file upload) |
| `GET` | `/api/print-orders/track` | Public | Track order by number or phone (name masked) |
| `GET` | `/api/print-orders` | Staff | List print orders |
| `GET` | `/api/print-orders/:id/download` | Staff | Download uploaded file |
| `PATCH` | `/api/print-orders/:id/status` | Staff | Update status (triggers auto-bill on `completed`) |

### Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports/dashboard` | Staff | Active sessions, revenue, station KPIs |
| `GET` | `/api/reports/revenue` | Admin | Daily revenue breakdown by date range |
| `GET` | `/api/reports/utilization` | Admin | Station hours used by date range |
| `GET` | `/api/reports/top-customers` | Admin | Top customers by total spend |
| `GET` | `/api/reports/export` | Admin | Download CSV (revenue or utilization) |

### Health
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server + live DB probe (`SELECT 1`) with latency |

---

## 💰 Billing Logic

Sessions are charged in configurable time blocks (default: **15 minutes**). The minimum charge is always one full block.

```
billedMinutes = max(blockMinutes, ceil(elapsedMinutes / blockMinutes) × blockMinutes)
timeCharge    = round2((billedMinutes × hourlyRate) / 60)
total         = round2(timeCharge + serviceCharge − discount)
```

**Examples at ₹30/hr with 15-min blocks:**

| Elapsed | Billed | Time Charge |
|---------|--------|-------------|
| 1 min   | 15 min | ₹7.50       |
| 15 min  | 15 min | ₹7.50       |
| 16 min  | 30 min | ₹15.00      |
| 60 min  | 60 min | ₹30.00      |
| 61 min  | 75 min | ₹37.50      |

**Bill number formats:**
- Session bills: `CC-YYYYMMDD-XXXX`
- Counter / print bills: `BILL-YYMMDD-XXXX`
- Booking codes: `BK-XXXX`
- Print order numbers: `PR-XXXX`

---

## 🔒 Security Notes

- All passwords hashed with **bcryptjs** (10 salt rounds)
- All DB queries use **parameterized statements** (mysql2) — SQL injection safe
- **Helmet** middleware sets security headers on every response
- **express-validator** validates all mutating request bodies
- File uploads restricted to 25 MB; allowed types: PDF, Word, Excel, PowerPoint, images
- Pre-commit secret scanner (`checkSecrets.js`) blocks hardcoded credentials
- `.env` files are **gitignored** — never committed

> ⚠️ **For production:** Set a strong `JWT_SECRET`, set `CORS_ORIGIN` to your domain, and migrate print file storage to cloud (S3 / GCS) — local disk is ephemeral on serverless platforms.

---

## 🌍 Deployment (Vercel)

The project includes a `vercel.json` that configures both services:

- `/api/*` → Express backend service
- `/*` → Vite SPA frontend (with client-side routing fallback)

```bash
vercel deploy
```

> **Note:** File uploads are stored to local disk and will not persist across serverless deployments. Cloud storage integration is recommended for production print order handling.

---

## 📋 Business Rules Summary

- One active session per customer at a time
- Station must be `available` to start a session; becomes `occupied` during session
- Confirmed bookings within 15 min block walk-in session creation for that station (unless same customer)
- Bookings not checked in within 15 min of start → auto-set to `no_show`
- Stock tracked per service (`NULL` = unlimited); insufficient stock blocks add-service
- Voiding a bill excludes it from revenue reports; it does not reverse stock
- Discount clamped between `0` and `timeCharge + serviceCharge`
- Counter bills have `time_charge = 0`; total = service charges − discount
- Print order cost auto-calculated from service price lookup; bill auto-generated on `completed`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| UI Components | Lucide React (icons), Recharts (charts) |
| Backend | Node.js, Express 5 |
| Database | MySQL 8, mysql2 (connection pool) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator |
| File Upload | Multer (disk storage) |
| Testing | Jest, Supertest |
| Deployment | Vercel |

---

## 📄 License

This project is for internal / educational use. All rights reserved.

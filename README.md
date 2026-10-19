# SmartClass — Intelligent Classroom Content Delivery System

<div align="center">

**Context-aware classroom teaching material delivery platform**

A full-stack capstone project designed to automate lecture material delivery using faculty identity, classroom context, timetable, and RFID card taps on classroom Raspberry Pis, all hosted on a local server inside the college.

</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Folder Structure](#4-folder-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Setup](#6-database-setup)
7. [Backend Startup](#7-backend-startup)
8. [Frontend Startup](#8-frontend-startup)
9. [Seed Data](#9-seed-data)
10. [Running Tests](#10-running-tests)
11. [API Documentation](#11-api-documentation)
12. [Authentication & RBAC](#12-authentication--rbac)
13. [File Storage Architecture](#13-file-storage-architecture)
14. [Current Lecture Logic](#14-current-lecture-logic)
15. [RFID Test Console](#15-rfid-test-console)
16. [Raspberry Pi Classroom Devices](#16-raspberry-pi-classroom-devices)
17. [Local Server Deployment](#17-local-server-deployment)

---

## 1. Project Overview

SmartClass automates the process of delivering the right teaching material to the right classroom at the right time.

**Setup (website on the local server):**

```
Admin registers faculty → Assigns RFID card → Registers classroom Pi (gets a device key) →
Faculty logs in and uploads PPT/PPTX/PDF → server converts presentations to PDF
```

**In the classroom (Raspberry Pi + PN532):**

```
Faculty taps RFID card → Pi sends UID to the local server →
Server returns ONLY that faculty's materials → faculty picks one on screen →
Pi opens it full screen (from its cache if unchanged) → session is logged →
tap again to log out
```

Everything (database, uploaded files, website) runs on one PC on the college network.
No cloud service is needed.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SmartClass Platform                          │
│                                                                      │
│  ┌──────────────┐    REST API    ┌──────────────────────────────┐   │
│  │   React      │ ◄──────────── │   Express + TypeScript       │   │
│  │   Frontend   │               │   Backend (Node.js)           │   │
│  │   (Vite)     │               │                              │   │
│  └──────────────┘               │  ┌──────────┐  ┌──────────┐ │   │
│                                 │  │  Prisma  │  │ Storage  │ │   │
│  ┌──────────────┐               │  │  ORM     │  │ Service  │ │   │
│  │   Future:    │               │  └────┬─────┘  └────┬─────┘ │   │
│  │  Raspberry   │               │       │              │       │   │
│  │  Pi + PN532  │ ──► POST ──►  │  ┌────▼─────┐  ┌────▼─────┐ │   │
│  └──────────────┘  /edge/auth   │  │PostgreSQL│  │  Local   │ │   │
│                                 │  │          │  │  Disk    │ │   │
│                                 │  └──────────┘  └──────────┘ │   │
│                                 └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key architectural principles:**
- Database stores **metadata** only (paths, hashes, versions)
- File storage stores **actual files** (separate from DB)
- Business logic is in **service layer**, not controllers
- **StorageService** abstraction allows swapping local disk → S3 with zero business logic changes
- Edge API is **hardware-agnostic**: receives UID strings, not hardware references

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + Radix UI primitives |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Icons | Lucide React |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (24h access tokens) |
| Password | bcrypt (12 rounds) |
| Validation | Zod |
| File Upload | Multer (memory storage) |
| Logging | Winston |
| Testing | Vitest |
| API Docs | Swagger/OpenAPI 3.0 |
| Security | Helmet + CORS + Rate limiting |

---

## 4. Folder Structure

```
smartclass/
├── backend/
│   ├── src/
│   │   ├── config/         # env config, Prisma client
│   │   ├── controllers/    # HTTP request handlers
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business logic layer
│   │   │   └── storage/    # StorageService abstraction
│   │   ├── middleware/     # Auth, RBAC, error handler, logger
│   │   ├── validators/     # Zod schemas + validate middleware
│   │   ├── utils/          # logger, fileUtils, password, response
│   │   ├── types/          # Shared TypeScript types
│   │   ├── app.ts          # Express app assembly
│   │   └── server.ts       # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema (11 entities)
│   │   └── seed.ts         # Development seed data
│   ├── tests/
│   │   ├── setup.ts
│   │   └── smartclass.test.ts
│   ├── uploads/            # File storage (gitignored)
│   ├── logs/               # Winston logs (gitignored)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/
│   ├── src/
│   │   ├── components/ui/  # Shared UI components
│   │   ├── contexts/       # AuthContext
│   │   ├── layouts/        # AppLayout (sidebar + topbar)
│   │   ├── pages/          # One file per page
│   │   ├── routes/         # React Router
│   │   ├── services/       # Axios API services
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # cn(), formatters
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css       # Design system + Tailwind
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── README.md
```

---

## 5. Environment Variables

### Backend (`backend/.env.example`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/smartclass` |
| `JWT_SECRET` | Secret for JWT signing (change in production!) | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token expiry | `24h` |
| `PORT` | API server port | `4000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `UPLOAD_DIR` | Upload directory (relative to backend root) | `uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `52428800` (50MB) |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Winston log level | `info` |

### Frontend (`frontend/.env.example`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:4000/api/v1` |

---

## 6. Database Setup

### Prerequisites
- PostgreSQL 14+ installed and running
- A database named `smartclass` created

### Steps

```bash
# 1. Navigate to backend
cd backend

# 2. Copy env file and fill in DATABASE_URL
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run migrations
npm run prisma:migrate

# 6. (Optional) Open Prisma Studio
npm run prisma:studio
```

---

## 7. Backend Startup

```bash
cd backend
cp .env.example .env    # Fill in your values
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev             # Development server with hot reload
```

The API will be available at: `http://localhost:4000`

Swagger UI: `http://localhost:4000/api-docs`

---

## 8. Frontend Startup

```bash
cd frontend
cp .env.example .env    # Set VITE_API_BASE_URL
npm install
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

## 9. Seed Data

```bash
cd backend
npm run seed
```

Creates:
- **Admin**: `admin@smartclass.edu` / `Admin@123`
- **4 Faculty** with RFID UIDs:
  - Dr. Priya Sharma → `04:A1:B2:C3:D4`
  - Prof. Rahul Mehta → `04:E5:F6:07:18`
  - Dr. Kavita Nair → `04:29:3A:4B:5C`
  - Prof. Arun Kumar → `04:6D:7E:8F:90`
- **5 Courses**: IOT301, DBMS201, OS401, VLSI302, ML501
- **3 Classrooms**: C-302, C-303, A-101
- **1 Edge Device**: PI-C302 (assigned to C-302, offline)
- **7 Timetable slots** across the week

---

## 10. Running Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests cover:
- Login / invalid credentials
- Faculty creation + duplicate email
- RFID registration + duplicate UID
- Timetable conflict detection (classroom + faculty)
- `getCurrentLecture()` active/inactive states
- Material upload validation + versioning
- File hash utility
- Path traversal protection
- Role-based authorization

---

## 11. API Documentation

### Swagger UI
After starting the backend, open:
```
http://localhost:4000/api-docs
```

### OpenAPI JSON
```
http://localhost:4000/api-docs.json
```

### API Base URL
```
http://localhost:4000/api/v1
```

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current user |
| GET | `/faculty` | List all faculty |
| POST | `/faculty` | Create faculty |
| GET | `/rfid` | List RFID cards |
| POST | `/rfid/register` | Register RFID |
| GET | `/courses` | List courses |
| GET | `/timetable/today` | Today's timetable |
| GET | `/timetable/current` | Current active lecture |
| POST | `/materials/upload` | Upload material (multipart) |
| GET | `/materials/:id/download` | Secure file download |
| POST | `/devices/:id/api-key` | Issue a new device key (admin) |
| POST | `/edge/tap` | Card tap from a Pi (`X-Device-Key`) |
| GET | `/edge/materials/:id/file` | Download for the Pi (`X-Device-Key` + `X-Tap-Token`) |
| POST | `/edge/materials/:id/open` | Log a lecture session |
| POST | `/edge/logout` | Close the faculty's sessions on this Pi |
| POST | `/edge/simulate-tap` | RFID Test Console (admin) |

---

## 12. Authentication & RBAC

- All endpoints (except `/auth/login`) require `Authorization: Bearer <token>`
- Tokens expire in 24h (configurable via `JWT_EXPIRES_IN`)
- Two roles: `ADMIN` and `FACULTY`

| Operation | Admin | Faculty |
|---|---|---|
| Manage faculty | ✅ | ❌ |
| Register RFID | ✅ | ❌ |
| Manage courses | ✅ | ❌ |
| View courses | ✅ | ✅ |
| Manage timetable | ✅ | ❌ |
| View timetable | ✅ | ✅ |
| Upload materials | ✅ | ✅ |
| Delete any material | ✅ | ❌ |
| Delete own material | ✅ | ✅ |
| View sessions | ✅ | Own only |
| Manage devices | ✅ | ❌ |

---

## 13. File Storage Architecture

### Storage structure

```
uploads/
└── courses/
    └── {COURSE_CODE}/
        └── {YEAR}/
            └── {safe-title}_v{version}_{uuid}.{ext}
```

Example:
```
uploads/courses/IOT301/2026/iot-unit-3-notes_v2_a1b2c3d4.pdf
```

### Design decisions
- **Original filename is never used** as the physical filename (prevents injection)
- **SHA-256 hash** is calculated on upload and stored in DB
- **Version** auto-increments when the same title is re-uploaded to the same course
- **StorageService** interface allows replacing local disk with S3:
  ```typescript
  // In backend/src/services/storage/index.ts — one line change:
  export const storageService = new S3StorageService(); // ← swap here
  ```

### Security
- Path traversal protection via `assertPathWithin()`
- MIME type + file extension both validated (never trust client alone)
- Files never served from static paths; always streamed through authenticated endpoint

---

## 14. Current Lecture Logic

The central `getCurrentLecture()` function in `timetableService.ts`:

```typescript
getCurrentLecture({ classroomId?, facultyId?, now? })
  → { active: boolean, slot: TimetableSlot | null }
```

**Algorithm:**
1. Determine current day of week (from `now`)
2. Convert current time to `HH:MM`
3. Query active timetable slots for that day (filtered by classroom/faculty)
4. Find a slot where `startTime ≤ currentTime < endTime`
5. If found: fetch latest material for that course
6. Return result

This function is **pure and reusable**, used by:
- Dashboard "Today" panel
- `GET /timetable/current` endpoint
- `GET /edge/current-lecture`
- `POST /edge/tap` (marks the materials for the lecture scheduled right now with "NOW")

---

## 15. RFID Test Console

The frontend includes a **RFID Test Console** at `/rfid-console` (admin only).

It allows you to:
1. Enter any RFID UID (or click quick-fill for seeded UIDs)
2. Specify a device code
3. Click "Simulate Card Tap"
4. See exactly what the classroom screen would show:
   - Faculty identity and classroom
   - The lecture scheduled right now (if any)
   - That faculty's materials, and whether each has a PDF ready

It runs the same code as a real tap, but no session is logged and no tap token is returned.

---

## 16. Raspberry Pi Classroom Devices

The kiosk app for the Pi is in [`edge-client/`](edge-client/). See its README for wiring and setup.

### How a tap works

1. The PN532 reads the card UID, e.g. `04:A1:B2:C3:D4`.
2. The Pi calls `POST /edge/tap {uid}` with its `X-Device-Key` header.
3. The server finds the faculty member who owns the card and returns **only materials that faculty uploaded**
   (latest version of each), plus a tap token that expires after 3 hours.
4. The faculty member picks a material. The Pi checks its cache (`materialId + version + SHA-256`).
   If the file isn't cached, it downloads it from `GET /edge/materials/:id/file` (the PDF when available).
5. The Pi opens the file full screen and calls `POST /edge/materials/:id/open`, which logs a lecture session.
6. Tapping the same card again, pressing **Log out**, or 15 idle minutes logs the faculty out.

### Security

- Each Pi has its own key. Only its SHA-256 hash is stored, and the key is shown once.
  If a Pi is stolen, issue a new key from **Edge Devices**.
- A tap token works only on the Pi that issued it, only for that faculty's files, and stops working
  as soon as the card is marked LOST or INACTIVE.
- Tap tokens can't be used to log in to the website.

### PowerPoint → PDF

PPT/PPTX uploads are converted to PDF in the background with headless LibreOffice (installed in the
backend Docker image). PDFs open quickly and look the same on the Pi. If conversion fails, the Pi opens the
original file with LibreOffice Impress instead. The Materials page shows the conversion status.

### Offline behaviour

If the server is unreachable, a faculty member who has tapped on that Pi before still sees the lectures
already saved on the Pi, and can present them.

---

## 17. Local Server Deployment

Runs PostgreSQL, the API (with LibreOffice), and the website behind nginx on one PC.
Requires Docker Desktop (Windows) or Docker Engine (Linux).

```bash
cp .env.server.example .env          # set POSTGRES_PASSWORD and JWT_SECRET
docker compose up -d --build
docker compose exec backend npm run seed   # optional demo data; prints the PI-C302 device key
```

- Website: `http://<server-LAN-IP>/` (find the IP with `ipconfig`). Give the PC a fixed IP or a DHCP
  reservation so the Pis can always find it.
- On Windows, allow inbound TCP port 80 in Windows Defender Firewall for the Private network.
- Uploaded files live in the `uploads` Docker volume and the database in `pgdata`. Back up both:
  ```bash
  docker compose exec db pg_dump -U smartclass smartclass > backup.sql
  docker run --rm -v smartclass_uploads:/data -v "$PWD":/out alpine tar czf /out/uploads.tgz -C /data .
  ```
- Update after pulling new code: `docker compose up -d --build` (migrations run automatically).

---

## License

MIT — for educational/capstone purposes.

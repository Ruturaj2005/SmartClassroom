# SmartClass — Intelligent Classroom Content Delivery System

<div align="center">

**Context-aware classroom teaching material delivery platform**

A full-stack capstone project designed to automate lecture material delivery using faculty identity, classroom context, timetable, and (future) RFID hardware integration.

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
16. [Future Raspberry Pi Integration](#16-future-raspberry-pi-integration)

---

## 1. Project Overview

SmartClass automates the process of delivering the right teaching material to the right classroom at the right time.

**Current software-only workflow:**

```
Admin registers faculty → Assigns RFID UID → Creates courses →
Configures classrooms → Sets up timetable → Faculty uploads materials →
System is ready for edge device integration
```

**Future hardware workflow (Raspberry Pi + PN532):**

```
Faculty taps RFID card → PN532 reads UID → Raspberry Pi sends to API →
Backend identifies faculty + classroom + current lecture →
Returns correct material → Pi opens/downloads presentation
```

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
| POST | `/edge/authenticate` | RFID auth (Pi endpoint) |
| GET | `/edge/sync` | Material sync for Pi |

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
- `GET /edge/current-lecture` (Raspberry Pi)
- `POST /edge/authenticate` (full RFID flow)

---

## 15. RFID Test Console

The frontend includes a **RFID Test Console** at `/rfid-console` (admin only).

It allows you to:
1. Enter any RFID UID (or click quick-fill for seeded UIDs)
2. Specify a device code
3. Click "Simulate Card Tap"
4. See the full authentication response:
   - Faculty identity
   - Classroom context
   - Current active lecture (if any)
   - Required teaching material + hash
   - Session created

This tests the **entire business workflow** before hardware arrives.

---

## 16. Future Raspberry Pi Integration

### What needs to be implemented (hardware side)

```python
# Raspberry Pi + PN532 pseudocode
import PN532
import requests

nfc = PN532(spi_bus=0)
DEVICE_CODE = "PI-C302"
API_URL = "https://smartclass.uni.edu/api/v1"

uid = nfc.read_card()  # Wait for RFID tap

response = requests.post(f"{API_URL}/edge/authenticate", json={
    "uid": format_uid(uid),
    "deviceCode": DEVICE_CODE
})

data = response.json()["data"]

if data["authenticated"] and data["lecture"]:
    material = data["material"]
    local_file = check_local_cache(material["id"], material["hash"])

    if not local_file:
        # Download from server
        download_material(material["id"], local_path)

    open_presentation(local_file)
```

### Backend API is already ready:
- `POST /api/v1/edge/authenticate` — receives UID + device code
- `GET /api/v1/edge/current-lecture` — get active lecture for classroom
- `GET /api/v1/edge/sync` — get all material metadata for pre-caching
- `GET /api/v1/materials/:id/download` — authenticated file download
- Response includes `fileHash` for cache validation

### No backend changes required for basic Pi integration.

---

## License

MIT — for educational/capstone purposes.

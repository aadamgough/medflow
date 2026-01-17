# MedFlow

Transform medical records into actionable insights. Upload, process, and understand patient documents in seconds with AI-powered document extraction.

## Architecture

```
medflow/
├── apps/
│   ├── api/          # Express.js backend (port 4000)
│   └── web/          # Next.js frontend (port 3000)
├── docker-compose.yml
└── package.json      # Root scripts for running both apps
```

## Quick Start

```bash
# Install dependencies
npm install
cd apps/api && npm install
cd ../web && npm install
cd ../..

# Start both servers
npm run dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000

## Environment Variables

### `apps/api/.env`

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_KEY="..."

# Redis (for job queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=4000
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### `apps/web/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## API Reference

Base URL: `http://localhost:4000`

### Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "jwt-token"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "jwt-token"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Patients

#### List Patients

```http
GET /api/patients?search=john&limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` (optional): Filter by name or external ID
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "patients": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### Create Patient

```http
POST /api/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "dateOfBirth": "1990-05-15",
  "externalId": "MRN-12345",
  "metadata": { "insuranceId": "INS-123" }
}
```

#### Get Patient

```http
GET /api/patients/:id
Authorization: Bearer <token>
```

#### Get Patient Summary

```http
GET /api/patients/:id/summary
Authorization: Bearer <token>
```

**Response includes:**
- Patient details
- `documentCount`: Total documents
- `lastDocumentAt`: Most recent document date
- `processingDocuments`: Documents currently being processed

#### Update Patient

```http
PUT /api/patients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "dateOfBirth": "1990-05-15"
}
```

#### Delete Patient

```http
DELETE /api/patients/:id
Authorization: Bearer <token>
```

### Documents

#### Upload Document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
patientId: "patient-id"
documentType: "DISCHARGE_SUMMARY" (optional)
```

**Document Types:**
- `DISCHARGE_SUMMARY`
- `LAB_RESULT`
- `CONSULTATION_NOTE`
- `PRESCRIPTION`
- `RADIOLOGY_REPORT`
- `UNKNOWN`

#### Get Document

```http
GET /api/documents/:id
Authorization: Bearer <token>
```

#### Get Patient Documents

```http
GET /api/documents/patient/:patientId
Authorization: Bearer <token>
```

#### Delete Document

```http
DELETE /api/documents/:id
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Database Schema

### User
- `id`: Primary key
- `email`: Unique email
- `passwordHash`: Bcrypt hash
- `name`: Display name
- `createdAt`, `updatedAt`

### Patient
- `id`: Primary key
- `userId`: Foreign key to User
- `name`: Patient name
- `dateOfBirth`: Optional date
- `externalId`: Optional MRN/external ID
- `metadata`: JSON field for custom data

### Document
- `id`: Primary key
- `patientId`: Foreign key to Patient
- `originalFilename`: Original file name
- `storagePath`: Path in Supabase storage
- `documentType`: Enum (DISCHARGE_SUMMARY, LAB_RESULT, etc.)
- `status`: Processing status (PENDING, PROCESSING, COMPLETED, FAILED)

### DocumentExtraction
- `id`: Primary key
- `documentId`: Foreign key to Document
- `extractedData`: JSON with extracted fields
- `confidenceScore`: AI confidence (0-1)

### TimelineEvent
- `id`: Primary key
- `patientId`: Foreign key to Patient
- `eventType`: DIAGNOSIS, MEDICATION_START, PROCEDURE, etc.
- `eventDate`: When the event occurred
- `description`: Event description
- `structuredData`: JSON with event details

## Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons

**Backend:**
- Express.js 5
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Redis + BullMQ (job queues)
- JWT authentication

**Infrastructure:**
- Supabase (database + file storage)
- Redis (local or hosted)

## Scripts

```bash
# Root level
npm run dev        # Run both API and web
npm run dev:api    # Run only API
npm run dev:web    # Run only web

# API (from apps/api)
npm run dev        # Development server
npm run build      # Build for production
npm run db:push    # Push Prisma schema to database
npm run db:studio  # Open Prisma Studio

# Web (from apps/web)
npm run dev        # Development server
npm run build      # Build for production
```

## License

Private - All rights reserved

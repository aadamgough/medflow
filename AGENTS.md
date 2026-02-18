# AGENTS.md - MedFlow Development Guide

## Project Overview

MedFlow is a monorepo with two applications:
- **apps/api**: Express.js 5 backend (TypeScript, Prisma, PostgreSQL, Redis/BullMQ)
- **apps/web**: Next.js 16 frontend (TypeScript, Tailwind CSS, React)

## Build, Lint, and Test Commands

### Root Commands
```bash
npm run dev           # Run both API (port 4000) and web (port 3000)
npm run build         # Build both apps
npm run lint         # Lint both apps
npm run lint:fix     # Fix lint issues in both apps
npm run typecheck    # TypeScript check both apps
npm run check        # Run typecheck + lint
```

### API Commands (apps/api)
```bash
npm run dev           # Dev server with nodemon
npm run dev:worker   # Background worker
npm run build        # Compile to dist/
npm run start        # Production server
npm run lint         # ESLint src/
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # TypeScript check
npm run db:push      # Push Prisma schema
npm run db:studio    # Open Prisma Studio
npm run db:seed-patients  # Seed test patients
```

### Web Commands (apps/web)
```bash
npm run dev           # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint src/
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # TypeScript check
```

### Running a Single Test
No test framework is configured. To add tests:
```bash
# API: npm install --save-dev jest @types/jest ts-jest
# Web: npm install --save-dev vitest @testing-library/react
```

## Code Style Guidelines

### TypeScript
- **API**: strict: true, module: commonjs, target ES2022
- **Web**: strict: true, module: esnext, target ES2017
- Always use explicit types - avoid `any`

### Imports
- **API**: Use relative paths (`../`, `./`)
- **Web**: Use path aliases (`@/`)
- Order: external → internal → relative

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `DocumentController` |
| Functions/variables | camelCase | `uploadDocument` |
| Interfaces/types | PascalCase | `PatientSummary` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| Database models | PascalCase | `User`, `Patient` |
| Database tables | snake_case | `@map("users")` |

### Error Handling

```typescript
async handler(req: AuthRequest, res: Response): Promise<void> {
  try {
    // business logic
    res.status(201).json({ data });
  } catch (error) {
    logger.error('Error', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

Use Zod for validation:
```typescript
const schema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  documentType: z.nativeEnum(DocumentType).optional(),
});
```

### API Structure
```
src/routes/       # Express routers
controllers/      # Request/response handling
services/         # Business logic
middleware/       # Auth, upload, etc.
config/           # DB, Redis, AWS
utils/            # Logger, jwt, etc.
types/            # TypeScript types
queues/           # BullMQ job queues
workers/          # Background processors
```

### Web Components
```typescript
interface Props {
  patient: Patient;
  onSelect: (id: string) => void;
}

export function Component({ patient, onSelect }: Props) {
  return <div onClick={() => onSelect(patient.id)}>{patient.name}</div>;
}
```

### Database (Prisma)
Always use `findFirst` with both `id` and `userId` for multi-tenant:
```typescript
const doc = await prisma.document.findFirst({
  where: { id: documentId, userId },
});
```

### ESLint Rules

**API**: no-unused-vars (warn), no-explicit-any (warn), prefer-const (error), no-var (error)
**Web**: Uses eslint-config-next (core-web-vitals + typescript)

### General Guidelines

1. Never commit secrets - add `.env*` to `.gitignore`
2. Always return after sending response
3. Handle array params: `const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;`
4. Use null instead of undefined for optional JSON fields
5. Prefer explicit return types for exported functions
6. Keep files under 300 lines
7. Use index.ts files for clean exports

## Environment Variables

**apps/api/.env**: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY, REDIS_HOST, REDIS_PORT, JWT_SECRET, JWT_EXPIRES_IN, PORT=4000, CLIENT_URL, NODE_ENV
**apps/web/.env**: NEXT_PUBLIC_API_URL=http://localhost:4000

## Adding New Features

### API endpoint
1. Create controller in `apps/api/src/controllers/`
2. Create service in `apps/api/src/services/`
3. Define route in `apps/api/src/routes/`
4. Add Zod validation
5. Run `npm run typecheck` and `npm run lint`

### Web component
1. Create in `apps/web/src/components/`
2. Export from index.ts
3. Follow existing Tailwind patterns

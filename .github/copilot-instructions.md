# Copilot Instructions - Project Cost & Quality Management

## Architecture Overview

Full-stack monorepo for tracking software project costs, effort, and quality metrics.

- **Backend**: NestJS + Sequelize ORM + PostgreSQL at `backend/`
- **Frontend**: React 18 + TanStack Router + TanStack Query + TailwindCSS at `frontend/`
- **API Proxy**: Frontend dev server proxies `/api` → `localhost:3000`

## Developer Workflow

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Start both services concurrently (recommended)
npm run start:dev

# Individual services
npm --prefix backend run start:dev   # Backend on port 3000
npm --prefix frontend run dev        # Frontend on port 5173
```

## Backend Patterns (`backend/src/`)

### Module Structure
Each domain follows NestJS module pattern with consistent file naming:
```
modules/{domain}/
├── {domain}.module.ts      # Module definition with imports/exports
├── {domain}.controller.ts  # REST endpoints
├── {domain}.service.ts     # Business logic
├── {domain}.model.ts       # Sequelize model with decorators
├── {domain}.dto.ts         # class-validator DTOs
└── {domain}.providers.ts   # Repository provider injection
```

### Dependency Injection Pattern
Use `forwardRef()` for circular dependencies between modules:
```typescript
@Inject(forwardRef(() => PhaseService))
private phaseService: PhaseService
```

### Repository Injection
Models are injected via providers using token pattern:
```typescript
@Inject('PROJECT_REPOSITORY') private projectRepository: typeof Project
```

### Key Business Logic
- **Metrics Calculation**: `metrics.service.ts` - SPI, CPI, EVM calculations
- **Status Evaluation**: `config/evaluation-thresholds.ts` - Rules for Good/Warning/At Risk
- **Default Phases**: Projects auto-create 5 phases (Functional Design → System Test)

## Frontend Patterns (`frontend/src/`)

### File-based Routing (TanStack Router)
Routes in `routes/` with dot-notation for nested paths:
- `projects.tsx` - Parent layout for `/projects/*`
- `projects.index.tsx` - List view at `/projects`
- `projects.$projectId.tsx` - Detail view at `/projects/:projectId`

### Data Fetching
Use TanStack Query with API service layer:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['project', projectId],
  queryFn: () => projectApi.getOne(projectId).then(r => r.data),
});
```

### API Service Organization
All API calls in `services/api.ts` organized by domain:
```typescript
export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  getOne: (id: number) => api.get<Project>(`/projects/${id}`),
  // ...
};
```

### Component Organization
- `components/common/` - Reusable UI (Button, Modal, Card, StatusBadge)
- `components/forms/` - Domain forms ({Domain}Form.tsx)
- `components/charts/` - Recharts visualizations
- Export via barrel files (`index.ts`)

### Internationalization
i18next configured for EN/VI. Use translation hook:
```typescript
const { t } = useTranslation();
// Usage: t('nav.projects'), t('project.statusGood')
```

### Path Aliases
Use `@/` for imports from `src/`:
```typescript
import { projectApi } from '@/services/api';
```

## Type Definitions

Shared types in `frontend/src/types/index.ts`:
- Status literals: `'Good' | 'Warning' | 'At Risk'`
- EffortUnit: `'man-hour' | 'man-day' | 'man-month'`

## Database

- PostgreSQL with Sequelize
- Models use `sequelize-typescript` decorators (`@Table`, `@Column`, `@HasMany`)
- Environment: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Key Domain Concepts

1. **Project** → has many **Phases** → has many **Efforts** (weekly records)
2. **Phase** links to **ScreenFunctions** via **PhaseScreenFunction** (many-to-many)
3. **Reports** capture snapshots with **Metrics** and **Commentary**
4. **Members** track team allocation and workload

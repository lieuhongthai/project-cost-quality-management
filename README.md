# Project Cost & Quality Management System

A comprehensive system for managing project costs, tracking progress, and evaluating quality metrics for software development projects.

## Features

- **Project Management**: Track multiple projects with detailed effort and progress metrics
- **Phase Tracking**: Monitor 5 development phases (Functional Design, Coding, Unit Test, Integration Test, System Test)
- **Effort Management**: Record weekly effort data with bulk input capability
- **Testing Metrics**: Track test cases, pass rates, defects, and testing efficiency
- **Advanced Metrics**: Calculate SPI, CPI, delay rates, and quality indicators
- **Reporting**: Generate weekly, phase-based, and project-level reports
- **AI Commentary**: Automatic insights generation using OpenAI (with fallback to template-based commentary)
- **Dashboard**: Visual overview of all projects and their status

## Tech Stack

### Backend
- **Framework**: NestJS
- **Database**: SQLite (with Sequelize ORM)
- **API**: RESTful
- **AI Integration**: OpenAI API

### Frontend
- **Framework**: React 18
- **Styling**: TailwindCSS
- **Routing**: TanStack Router
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation

## Project Structure

```
project-cost-quality-management/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   ├── modules/
│   │   │   ├── project/
│   │   │   ├── phase/
│   │   │   ├── effort/
│   │   │   ├── testing/
│   │   │   ├── report/
│   │   │   ├── commentary/
│   │   │   └── metrics/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── routes/
    │   ├── services/
    │   ├── types/
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    └── vite.config.ts
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run start:dev
```

Backend will run on http://localhost:3000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Database Schema

### Main Tables
- **projects**: Project information and settings
- **project_settings**: Configurable project parameters
- **phases**: Development phase tracking
- **efforts**: Weekly effort records
- **testings**: Testing metrics and quality data
- **reports**: Report metadata
- **commentaries**: Manual and AI-generated insights
- **metrics**: Calculated performance metrics

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Phases
- `GET /api/phases/project/:projectId` - Get phases by project
- `POST /api/phases` - Create phase
- `PUT /api/phases/:id` - Update phase

### Efforts
- `GET /api/efforts/phase/:phaseId` - Get efforts by phase
- `POST /api/efforts/bulk` - Bulk create efforts
- `GET /api/efforts/phase/:phaseId/summary` - Get effort summary

### Testing
- `GET /api/testing/phase/:phaseId` - Get testing data by phase
- `POST /api/testing` - Create testing record
- `GET /api/testing/phase/:phaseId/summary` - Get testing summary

### Reports
- `GET /api/reports/project/:projectId` - Get reports by project
- `POST /api/reports` - Create report

### Commentary
- `POST /api/commentaries/generate` - Generate AI commentary
- `POST /api/commentaries` - Create manual commentary

### Metrics
- `POST /api/metrics/phase/:phaseId?reportId=:reportId` - Calculate phase metrics
- `POST /api/metrics/project/:projectId?reportId=:reportId` - Calculate project metrics

## Metrics Calculation

### Schedule & Cost Metrics
- **SPI (Schedule Performance Index)**: EV / PV
- **CPI (Cost Performance Index)**: EV / AC
- **Delay Rate**: Percentage of delay
- **Delay in Man-Months**: Actual - Estimated effort

### Testing & Quality Metrics
- **Pass Rate**: (Passed / Total) * 100
- **Defect Rate**: Defects / Test Cases
- **Time per Test Case**: Testing Time / Total Cases
- **Test Cases per Hour**: Total Cases / Testing Time

## Status Evaluation Rules

### Project Status
- **Good**: SPI >= 0.95, CPI >= 0.95
- **Warning**: SPI >= 0.85, CPI >= 0.85
- **At Risk**: SPI < 0.85 or CPI < 0.85

### Testing Status
- **Good**: Pass Rate >= 95%
- **Acceptable**: Pass Rate >= 80%
- **Poor**: Pass Rate < 80%

## AI Commentary

The system uses OpenAI GPT-4 to generate insightful commentary on project reports. If the API fails or is not configured, it falls back to a template-based commentary system.

Commentary includes:
- Overall project health assessment
- Schedule and cost analysis
- Quality metrics evaluation
- Risk identification
- Actionable recommendations

## Development

### Backend Development
```bash
cd backend
npm run start:dev  # Development mode with hot reload
npm run build      # Build for production
npm run start:prod # Run production build
```

### Frontend Development
```bash
cd frontend
npm run dev        # Development mode
npm run build      # Build for production
npm run preview    # Preview production build
```

## License

MIT

## Authors

Developed for project cost and quality management in software development.

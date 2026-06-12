# Homeschool Learning Platform

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                     │
│                    Port 80/443                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────┐     ┌────────────────────┐
│   Next.js App    │     │  FastAPI Backend    │
│   Port 3000      │     │  Port 8000          │
│                  │     │                     │
│  - Auth Pages    │     │  - REST API v1      │
│  - Parent Dash   │────▶│  - JWT Auth         │
│  - Child Dash    │     │  - File Uploads     │
│  - Planner UI    │     │  - Report Gen       │
│  - Quiz UI       │     └────────┬────────────┘
│  - Charts        │              │
└─────────────────┘              │
                                 ▼
                      ┌────────────────────┐
                      │   PostgreSQL 16     │
                      │                     │
                      │   - 30+ Tables     │
                      │   - JSONB Storage  │
                      │   - Triggers       │
                      └────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + Shadcn UI (Radix/Base-UI primitives)
- **State Management**: @tanstack/react-query
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP**: Axios with JWT interceptors

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL 16
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Migrations**: Alembic

### Infrastructure
- **Containers**: Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (via certbot)
- **Uploads**: Local filesystem (configurable to S3)

## Project Structure

```
homeschool-platform/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # 18 route modules
│   │   ├── core/            # Config, DB, Security
│   │   ├── models/          # 28 SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # 12 service modules
│   │   └── integrations/    # Oak Academy
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/             # 30+ pages/routes
│   │   ├── components/
│   │   │   ├── layout/      # AppShell, Sidebar, Header
│   │   │   └── ui/          # 24 Shadcn components
│   │   ├── contexts/        # Auth context
│   │   ├── hooks/           # 7 React Query hook files
│   │   ├── services/        # API client (18 modules)
│   │   └── types/           # TypeScript interfaces
│   └── package.json
├── database/
│   └── schema.sql           # Full schema (29,000+ chars)
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── scripts/
│   └── setup.sh
└── docs/
    └── ARCHITECTURE.md
```

## Database Schema (28 Tables)

### Core
- `users` - Authentication & roles (parent/child/admin)
- `children` - Parent-child relationships
- `subjects` - Learning subjects with colors/icons

### Learning
- `lessons` - Lesson content & metadata
- `lesson_assignments` - Lesson-child-date assignments
- `quizzes` - Quiz configurations
- `quiz_questions` - Questions (7 types)
- `quiz_assignments` - Quiz-child links
- `quiz_attempts` - Quiz attempts & scores
- `worksheets` - Uploaded & interactive worksheets
- `worksheet_assignments` - Worksheet-child links

### Planning
- `planner_entries` - Daily schedule (8 slots)
- `attendance` - Daily attendance tracking

### Gamification
- `xp_events` - All XP transactions
- `levels` - 8 level definitions (Explorer → Grand Master)
- `child_levels` - Per-child level state
- `badges` - 15 badge definitions
- `child_badges` - Earned badges
- `streaks` - 5 streak types
- `reward_configs` - Parent-configured rewards
- `reward_history` - Reward payouts

### Extras
- `reading_log` - Book tracking
- `coding_projects` - Coding challenges
- `coding_submissions` - Code submissions
- `timeline_events` - Achievement timeline
- `extra_credit_tasks` - Bonus tasks
- `oak_academy_cache` - Imported content
- `notifications` - In-app notifications

## API Routes (60+ endpoints)

| Module     | Endpoints                | Description       |
|-----------|--------------------------|-------------------|
| Auth      | /auth/*                  | Login, register, tokens |
| Children  | /children/*              | CRUD, assign      |
| Subjects  | /subjects/*              | CRUD              |
| Lessons   | /lessons/*               | CRUD, assign, rollover |
| Planner   | /planner/*               | Daily/weekly/monthly |
| Quizzes   | /quizzes/*               | CRUD, attempts, grading |
| Worksheets| /worksheets/*            | CRUD, upload, interactive |
| Progress  | /children/:id/xp,level,badges,streaks,timeline |
| Rewards   | /rewards/*               | Configs, history   |
| Attendance| /attendance/*            | Mark, stats, trends |
| Reading   | /reading-log/*           | CRUD               |
| Coding    | /coding/*                | Projects, submissions |
| Dashboard | /dashboard/parent,child  | Aggregated views   |
| Oak       | /oak/*                   | Search, import     |
| Reports   | /reports/*               | Daily, weekly, monthly |
| Extra Credit | /extra-credit/*       | CRUD, complete     |
| Notifications | /notifications/*     | List, mark read    |

## Authentication Flow

1. User registers with email/username/password
2. Password hashed with bcrypt, stored in `users` table
3. Login returns JWT access token (24h) + refresh token (30d)
4. Access token sent as Bearer token in Authorization header
5. Token refresh on 401 response via axios interceptor
6. Middleware protects dashboard routes server-side
7. AuthGuard component protects client-side
8. Role-based access: parent vs child routes

## Key Features Implemented

### Gamification System
- **XP**: Awarded for lessons, quizzes, worksheets, reading, coding
- **8 Levels**: Explorer → Adventurer → Apprentice → Inventor → Scientist → Engineer → Master Scholar → Grand Master
- **15 Badges**: First Lesson, Perfect Week, 100 Lessons, 30-Day Streak, etc.
- **Streaks**: Daily learning, reading, coding, science, math
- **Timeline**: Visual achievement feed

### Planner System
- Day/Week/Month views with slot-based scheduling
- Drag-and-drop via slot reordering
- Automatic lesson rollover for incomplete lessons
- Per-child planner

### Interactive Features
- **Quizzes**: Multiple choice, true/false, short answer with auto-grading
- **Worksheets**: Upload (PDF/doc) and interactive (MC, drag-drop, matching, fill-blanks)
- **Coding**: HTML/CSS/JS projects with in-browser editor
- **Reading Log**: Book tracking with ratings and streak

### Analytics
- Daily/weekly/monthly reports
- Subject performance breakdown
- Attendance trends
- Completion rates
- Recharts visualizations (bar, line, pie, area charts)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Python 3.12+ (for local dev)

### Production (Docker)
```bash
cd homeschool-platform/docker
cp ../backend/.env.example .env
# Edit .env with your secrets
docker compose up -d
```

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev

# Database
docker run -d --name homeschool-db \
  -e POSTGRES_DB=homeschool \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v $(pwd)/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql \
  postgres:16-alpine
```

### Environment Variables (.env)
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/homeschool
SECRET_KEY=<random-64-char-string>
CORS_ORIGINS=*
ENV=development
DEBUG=true
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Frontend Routes

| Path | View | Role |
|------|------|------|
| /login | Login | Public |
| /register | Register | Public |
| /forgot-password | Forgot Password | Public |
| /reset-password | Reset Password | Public |
| /dashboard/parent | Parent Dashboard | Parent |
| /dashboard/parent/children | Manage Children | Parent |
| /dashboard/parent/subjects | Manage Subjects | Parent |
| /dashboard/parent/lessons | Manage Lessons | Parent |
| /dashboard/parent/lessons/[id] | Lesson Detail | Parent |
| /dashboard/parent/planner | Planner | Parent |
| /dashboard/parent/quizzes | Manage Quizzes | Parent |
| /dashboard/parent/worksheets | Manage Worksheets | Parent |
| /dashboard/parent/rewards | Rewards | Parent |
| /dashboard/parent/reading-log | Reading Log | Parent |
| /dashboard/parent/coding | Coding Projects | Parent |
| /dashboard/parent/reports | Analytics | Parent |
| /dashboard/parent/oak-academy | Oak Import | Parent |
| /dashboard/child | Child Dashboard | Child |
| /dashboard/child/lessons | My Lessons | Child |
| /dashboard/child/quizzes | My Quizzes | Child |
| /dashboard/child/worksheets | My Worksheets | Child |
| /dashboard/child/reading | My Reading | Child |
| /dashboard/child/coding | My Coding | Child |
| /dashboard/child/rewards | My Rewards | Child |
| /dashboard/child/timeline | Timeline | Child |
| /dashboard/child/achievements | Badges | Child |
| /extra-credit | Extra Credit | Parent |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** 2025-10-07 15:45

## Current Status

**Phase 1 Complete (100%)** - All core foundation components implemented and working:
- ✅ Database schema with Prisma (User, SkillTree, Skill, Task, Activity, Achievement models)
- ✅ AI integration with OpenAI SDK + Zod validation (`/lib/ai.ts`)
- ✅ API endpoints: `/api/ai/generate-tree` and `/api/ai/evaluate-task`
- ✅ Landing page with SkillTreeGenerator form (`app/page.tsx`)
- ✅ shadcn/ui component library integration (10+ components)
- ✅ Tailwind CSS v4 styling with dark/light theme support

**Phase 2 Complete (100%)** - Interactive skill tree visualization implemented:
- ✅ React Flow integration with custom SkillNode components (`components/skill-tree-canvas.tsx`)
- ✅ API endpoint `/api/skill-tree/[id]` to fetch skill trees with prerequisites
- ✅ Skill tree visualization page `/tree/[id]` with zoom, pan, and minimap controls
- ✅ Database integration: AI-generated trees saved to PostgreSQL with prerequisite relationships
- ✅ Auto-redirect from generator to visualization after skill tree creation
- ✅ **Streaming SSE support**: Real-time progress updates during AI generation (`/api/ai/generate-tree-stream`)
- ✅ Visual status indicators: LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MASTERED
- ✅ Progress bars for XP and task completion on each skill node
- ✅ Animated edges for IN_PROGRESS skills

**Phase 3 Complete (100%)** - Full authentication and user dashboard:
- ✅ NextAuth.js v5 with GitHub OAuth provider (`/lib/auth.ts`)
- ✅ Protected routes via middleware (`middleware.ts`)
- ✅ User dashboard at `/dashboard` with skill tree management
- ✅ Authentication UI: sign-in page, user navigation dropdown with avatar
- ✅ Cloud sync: All skill trees linked to authenticated users
- ✅ Stats overview: Total trees, skills, and completion progress
- ✅ API routes require authentication and link data to userId

**Phase 4 (NEXT)** - Gamification mechanics (XP calculation, leveling, achievement unlocks, streaks)

**Recent Changes** (last session):
- Implemented NextAuth.js v5 with GitHub OAuth authentication
- Created auth configuration and route handlers (`/lib/auth.ts`, `/app/api/auth/[...nextauth]/route.ts`)
- **Fixed edge runtime compatibility**: Using JWT sessions instead of database sessions (middleware works in edge runtime)
- Added middleware to protect dashboard and API routes that modify user data
- Updated skill tree generation APIs to link trees to authenticated users (removed demo user)
- Built user dashboard page with stats overview (total trees, skills, completion %)
- Created UserNav component with avatar, dropdown menu, and sign-out functionality
- Added sign-in page with GitHub OAuth integration (`/app/auth/signin/page.tsx`)
- Updated root layout with sticky header and navigation
- Added GitHub OAuth environment variables to .env.example

## Project Overview

SkillForge is an AI-powered personal growth tracking system that gamifies learning with interactive skill trees. Users define learning goals, and Claude AI generates personalized skill trees with XP, levels, achievements, and task progression.

## Development Commands

### Setup & Database
```bash
npm install                    # Install dependencies
npx prisma generate           # Generate Prisma client
npx prisma migrate dev        # Run database migrations
npx prisma studio            # Open Prisma Studio (database GUI)
```

### Development
```bash
npm run dev                   # Start dev server with Turbopack (http://localhost:3000)
npm run build                 # Production build with Turbopack
npm start                     # Start production server
npm run lint                  # Run ESLint
```

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: App URL (http://localhost:3000 for local)
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js (generate with `openssl rand -base64 32`)
- `AUTH_GITHUB_ID`: GitHub OAuth App Client ID (get from https://github.com/settings/developers)
- `AUTH_GITHUB_SECRET`: GitHub OAuth App Client Secret
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `OPENAI_BASE_URL`: (Optional) Custom API endpoint for OpenAI-compatible services
- `OPENAI_MODEL`: (Optional) Model name, defaults to `gpt-4o`

## Architecture

### Core Technologies
- **Next.js 15.5.4** with App Router and Turbopack
- **React 19** with TypeScript
- **Prisma ORM** + PostgreSQL for data persistence
- **OpenAI API** (with Zod schema validation) for AI skill tree generation and task evaluation
- **NextAuth.js v5** with GitHub OAuth authentication
- **Zustand** for state management
- **Tailwind CSS v4** + shadcn/ui components
- **@xyflow/react** for visual skill tree rendering

### AI Integration Pattern

All AI features use OpenAI SDK with **Zod schema validation** via `/lib/ai.ts`:

1. **Skill Tree Generation** (`/api/ai/generate-tree-stream` - streaming, `/api/ai/generate-tree` - legacy)
   - Input: User goal, skill level, weekly hours, preferences
   - Output: 15-25 skills with dependencies, difficulty ratings (1-10), XP rewards, learning resources
   - Streaming mode: Real-time progress updates via Server-Sent Events (SSE)
   - Validates response with `SkillTreeResponseSchema` (Zod)
   - Saves generated trees to database with prerequisite relationships

2. **Task Evaluation** (`/api/ai/evaluate-task`)
   - Input: Task details, user submission, base XP
   - Output: Quality score (1-10), adjusted XP, constructive feedback, improvement suggestions
   - Validates response with `TaskEvaluationSchema` (Zod)

**Architecture benefits**:
- Type-safe responses (Zod infers TypeScript types from schemas)
- Reliable JSON parsing (OpenAI's structured outputs)
- Works with any OpenAI-compatible API (set `OPENAI_BASE_URL`)

### Database Schema (Prisma)

Key models and relationships:

- **User**: Authentication + gamification stats (totalXP, level, currentStreak, longestStreak)
  - Has many: SkillTree, Activity, UserAchievement
  - NextAuth relations: Account, Session

- **SkillTree**: Container for a learning path
  - Belongs to: User
  - Has many: Skill
  - Fields: name, domain, isTemplate, isPublic, aiGenerated

- **Skill**: Individual learning unit with self-referential dependencies
  - Belongs to: SkillTree
  - Has many: Task, Activity
  - Self-relation: prerequisites/dependents (many-to-many)
  - Status enum: LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED → MASTERED
  - Visual: positionX/positionY for React Flow rendering
  - Leveling: currentLevel, maxLevel, currentXP, xpToNextLevel

- **Task**: Actionable items to complete skills
  - Belongs to: Skill
  - Type enum: PRACTICE, PROJECT, STUDY, CHALLENGE, MILESTONE
  - AI evaluation: qualityScore, aiFeedback

- **Activity**: Audit log for all user actions
  - Type enum: TASK_COMPLETE, STUDY_SESSION, MANUAL_LOG, MILESTONE_REACHED, LEVEL_UP, SKILL_UNLOCKED, SKILL_MASTERED
  - Tracks XP gains, duration, timestamps

- **Achievement** + **UserAchievement**: Badge system
  - Rarity enum: COMMON, RARE, EPIC, LEGENDARY

### Project Structure

```
app/
├── api/
│   ├── ai/
│   │   ├── generate-tree/route.ts         # Legacy AI skill tree generation (non-streaming)
│   │   ├── generate-tree-stream/route.ts  # Streaming AI generation with SSE
│   │   └── evaluate-task/route.ts         # AI task evaluation
│   ├── auth/[...nextauth]/route.ts        # NextAuth.js route handlers
│   └── skill-tree/[id]/route.ts           # Fetch skill tree data
├── auth/signin/page.tsx                   # Sign-in page with GitHub OAuth
├── dashboard/page.tsx                     # User dashboard with skill tree list
├── tree/[id]/page.tsx                     # Skill tree visualization page
├── layout.tsx                              # Root layout with header and navigation
└── page.tsx                                # Landing page with SkillTreeGenerator

components/
├── ui/                                     # shadcn/ui components (button, card, input, badge, etc.)
├── skill-tree-generator.tsx                # Main form with streaming progress display
├── skill-tree-canvas.tsx                   # React Flow visualization component
└── user-nav.tsx                            # User navigation with avatar and dropdown

lib/
├── ai.ts               # AI client (generateSkillTreeStream, generateSkillTree, evaluateTaskCompletion)
├── auth.ts             # NextAuth.js configuration with GitHub provider
├── prisma.ts           # Prisma client singleton
└── utils.ts            # Utility functions (cn for class merging)

middleware.ts           # Route protection middleware

prisma/
├── schema.prisma       # Database schema with comprehensive gamification models
└── migrations/         # Database migration history
```

### Component Patterns

- **Server Components by default** (Next.js App Router)
- **'use client' directive** for interactivity (SkillTreeGenerator, UI components)
- **shadcn/ui** for consistent design system
- **Zod validation** on API routes for type safety

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **CSS variables** in `app/globals.css` for theming (light/dark mode via next-themes)
- **Class merging** via `cn()` utility (clsx + tailwind-merge)

## Development Workflow

### Adding New Features

1. **Database changes**: Update `prisma/schema.prisma` → run `npx prisma migrate dev` → run `npx prisma generate`
2. **New AI features**: Add functions to `/lib/ai.ts`, create API route in `/app/api/`, validate with Zod
3. **UI components**: Use shadcn/ui CLI or add to `/components/ui/`, follow existing patterns
4. **State management**: Use Zustand stores for complex client state

### Testing AI Features Locally

- Set `OPENAI_API_KEY` in `.env` (required)
- Optional: Set `OPENAI_BASE_URL` for custom endpoints (e.g., local LLM, proxy)
- Optional: Set `OPENAI_MODEL` to override default (`gpt-4o`)
- Test via SkillTreeGenerator component on landing page
- Check API responses in Network tab for proper JSON structure
- Monitor API usage and token consumption

## Roadmap Context

**Phase 1 (✅ COMPLETED)**: Core foundation, database schema, AI integration, landing page

**Phase 2 (✅ COMPLETED)**: Interactive skill tree visualization with React Flow, streaming AI generation, database integration

**Phase 3 (✅ COMPLETED)**: Full authentication (NextAuth.js), user dashboard, cloud sync

**Phase 4 (NEXT)**: Gamification mechanics (XP calculation, leveling, achievement unlocks, streaks)

**Phase 5**: Task management system with AI evaluation

**Phase 6**: Animations (Framer Motion), mobile optimization, production deployment

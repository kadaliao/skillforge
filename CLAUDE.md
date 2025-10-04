# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** 2025-10-07 00:30

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

**Phase 3 (NEXT)** - Full authentication (NextAuth.js), user dashboard, cloud sync

**Recent Changes** (last session):
- Implemented streaming AI generation with real-time progress feedback (SSE/Server-Sent Events)
- Added `generateSkillTreeStream()` function with token counting and progress callbacks
- Created SkillTreeCanvas component with React Flow for interactive skill tree visualization
- Built `/tree/[id]` route for displaying generated skill trees with full interactivity
- Enhanced `/api/ai/generate-tree` to save skill trees to database with prerequisite connections
- Added robust JSON extraction logic to handle markdown code blocks from AI responses
- Configured PostgreSQL database and ran initial Prisma migrations
- Fixed TypeScript strict mode issues (Zod `error.issues` instead of `error.errors`)
- Updated frontend to display real-time streaming progress in monospace console-like UI

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
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `OPENAI_BASE_URL`: (Optional) Custom API endpoint for OpenAI-compatible services
- `OPENAI_MODEL`: (Optional) Model name, defaults to `gpt-4o`

## Architecture

### Core Technologies
- **Next.js 15.5.4** with App Router and Turbopack
- **React 19** with TypeScript
- **Prisma ORM** + PostgreSQL for data persistence
- **OpenAI API** (with Zod schema validation) for AI skill tree generation and task evaluation
- **NextAuth.js v5** for authentication (setup in progress)
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
│   └── skill-tree/[id]/route.ts           # Fetch skill tree data
├── tree/[id]/page.tsx                     # Skill tree visualization page
├── layout.tsx                              # Root layout with theme provider
└── page.tsx                                # Landing page with SkillTreeGenerator

components/
├── ui/                                     # shadcn/ui components (button, card, input, badge, etc.)
├── skill-tree-generator.tsx                # Main form with streaming progress display
└── skill-tree-canvas.tsx                   # React Flow visualization component

lib/
├── ai.ts               # AI client (generateSkillTreeStream, generateSkillTree, evaluateTaskCompletion)
├── prisma.ts           # Prisma client singleton
└── utils.ts            # Utility functions (cn for class merging)

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

**Phase 3 (NEXT)**: Full authentication (NextAuth.js), user dashboard, cloud sync

**Phase 4**: Gamification mechanics (XP calculation, leveling, achievement unlocks, streaks)

**Phase 5**: Task management system with AI evaluation

**Phase 6**: Animations (Framer Motion), mobile optimization, production deployment

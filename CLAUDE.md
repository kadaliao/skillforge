# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** 2025-10-07 19:45

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

**Phase 4 Complete (100%)** - Full gamification mechanics implemented:
- ✅ **XP & Leveling System**: Exponential XP formulas for both user and skill progression (`/lib/gamification.ts`)
- ✅ **Task Completion API**: `/api/tasks/[taskId]/complete` with full progression logic (XP awards, skill leveling, prerequisite unlocking)
- ✅ **AI Task Evaluation**: Submission-based quality scoring (1-10) with adjusted XP rewards and feedback
- ✅ **Streak Tracking**: Daily activity tracking with currentStreak/longestStreak (48-hour grace period)
- ✅ **Achievement System**: 12 predefined achievements (COMMON → LEGENDARY rarity) with auto-detection
- ✅ **Achievement Seeding**: Database seeding script (`prisma/seed-achievements.ts`)
- ✅ **Task Completion UI**: Dialog component with submission/notes fields and AI feedback display
- ✅ **Interactive Skill Tree**: Clickable nodes with task panel, real-time progress updates
- ✅ **Header Stats Display**: User level, total XP, and current streak in navigation
- ✅ **Achievement Page**: `/achievements` with rarity grouping and unlock progress tracking
- ✅ **Database Updates**: Simplified Achievement model, added Task submission/notes fields, Activity metadata

**Phase 5 Complete (100%)** - Task management and analytics implemented:
- ✅ **Manual Task Creation**: `POST /api/tasks` endpoint + TaskCreateDialog UI component with full validation
- ✅ **Task Editing/Deletion**: `PUT /api/tasks/[taskId]` and `DELETE /api/tasks/[taskId]` endpoints with ownership verification
- ✅ **Bulk Operations**: Simplified bulk complete/delete endpoints (`/api/tasks/bulk-complete`, `/api/tasks/bulk-delete`) with transaction support
- ✅ **Task Reordering**: `PUT /api/tasks/reorder` endpoint with order field in Task model (migration applied)
- ✅ **Enhanced Task Panel**: Checkbox selection, bulk actions toolbar, individual delete buttons, "Add Task" button
- ✅ **Progress Analytics**: `GET /api/analytics/progress` endpoint with daily XP aggregation and cumulative tracking (7/14/30/90 day views)
- ✅ **Skills Analytics**: `GET /api/analytics/skills` endpoint with status breakdown and tree-level completion rates
- ✅ **Analytics Page**: `/analytics` with tabbed interface, XP progression charts, skill status distribution, completion rates
- ✅ **Database Schema**: Added Task.order field with composite index for efficient ordering queries

**Phase 6 (IN PROGRESS)** - Polish and production readiness:
- ✅ **UI/UX Overhaul**: Replaced complex React Flow canvas with simple hierarchical card layout
- ✅ **Skill Tree Redesign**: Level-based grouping with clear prerequisite arrows (↑ badges)
- ✅ **Consistent Layout**: Unified spacing (py-6 px-4) and responsive design across all pages
- ✅ **Improved Navigation**: Cleaner header (h-14), optimized button sizes, mobile-friendly layouts
- ⏳ **Animations**: Smooth transitions and micro-interactions (pending)
- ⏳ **Mobile Optimization**: Touch-friendly controls and gestures (pending)
- ⏳ **Deployment**: Production build and hosting setup (pending)

**Recent Changes** (this session):
- **Skill Tree Visualization Overhaul**: Replaced React Flow canvas with `SkillTreeSimple` component using traditional HTML/CSS
  - Hierarchical level-based layout with clear visual grouping
  - Prerequisites shown as clickable ↑ badges for easy navigation
  - Removed unnecessary complexity (zoom, pan, drag) for better UX
  - Fixed dagre auto-layout issues by removing hardcoded grid positions
- **Global Layout Improvements**:
  - Unified all pages with `container mx-auto py-6 px-4` pattern
  - Reduced header height (h-16 → h-14) and font sizes for better density
  - Made all pages responsive (mobile-first approach)
  - Fixed duplicate logo issue on landing page
- **Component Optimizations**:
  - Skill cards: Smaller padding (p-4 → p-3), compact fonts, better information hierarchy
  - Achievement cards: Tighter spacing, smaller badges (text-[10px]), improved status indicators
  - Dashboard: Smaller buttons (size="sm"), responsive stats layout
  - Analytics: Added descriptive subtitles, responsive headers

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
  - Fields: order (for manual reordering), submission, notes, estimatedHours
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
│   ├── analytics/
│   │   ├── progress/route.ts              # XP progression over time endpoint
│   │   └── skills/route.ts                # Skill completion stats endpoint
│   ├── auth/[...nextauth]/route.ts        # NextAuth.js route handlers
│   ├── skill-tree/[id]/route.ts           # Fetch skill tree data
│   └── tasks/
│       ├── route.ts                       # Create tasks (POST)
│       ├── [taskId]/
│       │   ├── route.ts                   # Edit/delete tasks (PUT/DELETE)
│       │   └── complete/route.ts          # Task completion with gamification logic
│       ├── bulk-complete/route.ts         # Bulk task completion
│       ├── bulk-delete/route.ts           # Bulk task deletion
│       └── reorder/route.ts               # Task reordering
├── achievements/page.tsx                  # Achievement showcase with unlock tracking
├── analytics/page.tsx                     # Analytics dashboard with XP/skill charts
├── auth/signin/page.tsx                   # Sign-in page with GitHub OAuth
├── dashboard/page.tsx                     # User dashboard with skill tree list
├── tree/[id]/page.tsx                     # Skill tree visualization page
├── layout.tsx                              # Root layout with header and navigation
└── page.tsx                                # Landing page with SkillTreeGenerator

components/
├── ui/                                     # shadcn/ui components (button, card, input, badge, select, etc.)
├── skill-tree-generator.tsx                # Main form with streaming progress display
├── skill-tree-canvas.tsx                   # Legacy React Flow visualization (deprecated)
├── skill-tree-simple.tsx                   # Current: Simple hierarchical card-based skill tree layout
├── task-completion-dialog.tsx              # Task completion modal with AI evaluation
├── task-create-dialog.tsx                  # Task creation modal with form validation
└── user-nav.tsx                            # User navigation with stats display and dropdown

lib/
├── ai.ts               # AI client (generateSkillTreeStream, generateSkillTree, evaluateTaskCompletion)
├── auth.ts             # NextAuth.js configuration with GitHub provider
├── gamification.ts     # XP formulas, leveling, streaks, achievement definitions
├── prisma.ts           # Prisma client singleton
└── utils.ts            # Utility functions (cn for class merging)

middleware.ts           # Route protection middleware

prisma/
├── schema.prisma            # Database schema with comprehensive gamification models
├── migrations/              # Database migration history
└── seed-achievements.ts     # Achievement seeding script
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

**Phase 4 (✅ COMPLETED)**: Gamification mechanics (XP calculation, leveling, achievement unlocks, streaks)

**Phase 5 (✅ COMPLETED)**: Task management enhancements (manual task creation, bulk operations, progress analytics)

**Phase 6 (NEXT)**: Polish and production readiness (animations, mobile optimization, deployment)

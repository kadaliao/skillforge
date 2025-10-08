# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** 2025-10-08 15:30

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

**Phase 6 Complete (100%)** - Polish and production readiness:
- ✅ **UI/UX Overhaul**: Replaced complex React Flow canvas with simple hierarchical card layout
- ✅ **Skill Tree Redesign**: Level-based grouping with clear prerequisite arrows (↑ badges)
- ✅ **Consistent Layout**: Unified spacing (py-6 px-4) and responsive design across all pages
- ✅ **Improved Navigation**: Cleaner header (h-14), optimized button sizes, mobile-friendly layouts
- ✅ **Personalized AI Generation**: Multi-dimensional context input (background, existing skills, learning preferences)
- ✅ **AI-Generated Task Checklists**: Context-aware completion options generated during skill tree creation

**Phase 7 Complete (100%)** - Template sharing and management:
- ✅ **Template Library**: `/templates` page with public skill tree gallery
- ✅ **Template Sharing API**: `POST /api/skill-tree/[id]/share` to toggle public/private status
- ✅ **Template Cloning API**: `POST /api/skill-tree/[id]/clone` with deep copy and custom naming
- ✅ **Clone Dialog**: User-friendly rename dialog before cloning templates
- ✅ **Skill Tree Deletion**: `DELETE /api/skill-tree/[id]` with cascade delete and confirmation
- ✅ **Share/Delete UI**: Dropdown menu with share, unshare, and delete options
- ✅ **Navigation Integration**: Templates link in user navigation and guest header
- ✅ **Data Isolation**: Cloned trees are fully independent (unshare/delete original doesn't affect clones)

**Phase 8 Complete (100%)** - Advanced features:
- ⏳ **Animations**: Smooth transitions and micro-interactions (deferred to future)
- ⏳ **Mobile Optimization**: Touch-friendly controls and gestures (deferred to future)
- ✅ **Deployment**: Production build and hosting setup (completed)
- ✅ **Achievement Backfill**: Historical data migration script for retroactive achievement unlocks
- ✅ **Bulk Task Enhancement**: Achievement detection integrated into bulk completion operations
- ✅ **Edge Function Optimization**: Middleware removed to resolve Vercel size limits
- ✅ **TypeScript Build**: All compilation errors resolved for production build

**Recent Changes** (this session):
- **Achievement System Enhancements** (Phase 8):
  - Created `scripts/backfill-achievements.ts` for retroactive achievement detection based on historical user data
  - Integrated achievement detection into bulk task completion (`/api/tasks/bulk-complete`)
  - Ensures achievements are awarded consistently across all completion methods (single, bulk, manual)
- **Production Build Fixes** (Phase 8):
  - Removed middleware to resolve Vercel Edge Function bundle size limit
  - Fixed all TypeScript compilation errors in production build
  - Resolved session.user undefined errors in DELETE routes
  - Updated auth checks to handle nullable session.user safely

**Previous Session Changes**:
- **Vercel + Neon Deployment Setup** (Phase 8):
  - Added Vercel deployment configuration (`vercel.json`) with build commands and region settings
  - Updated `package.json` with `postinstall` and `vercel-build` scripts for automated Prisma client generation and migrations
  - Created comprehensive deployment guide (`DEPLOYMENT.md`) with Neon database setup, environment variables, and troubleshooting
  - Added production environment template (`.env.production.example`) with all required variables and documentation
  - Created one-click deployment script (`deploy.sh`) with pre-flight checks and post-deployment checklist
  - Updated `.gitignore` to include environment example files while protecting production secrets
  - Removed Turbopack from production build (kept for dev) for better Vercel compatibility
  - Files: `vercel.json`, `package.json`, `DEPLOYMENT.md`, `.env.production.example`, `deploy.sh`, `.gitignore`

**Earlier Session Changes**:
- **ShareTemplateButton Integration Fix** (Phase 7 enhancement):
  - Fixed missing share template functionality in dashboard skill tree cards
  - Updated `SkillTreeCard` component to integrate `ShareTemplateButton` dropdown menu
  - Modified dashboard query to fetch `isTemplate` and `isPublic` fields from database
  - Replaced redundant delete-only button with unified three-dot menu (share/unshare/delete)
  - Files updated: `app/dashboard/page.tsx:17-45`, `components/skill-tree-card.tsx`
  - Cleaned up duplicate delete logic - now handled by ShareTemplateButton component

**Historical Changes**:
- **Template Sharing System** (Phase 7):
  - Created `/templates` page with public skill tree gallery
  - Implemented share/unshare API with privacy confirmation dialogs
  - Built deep clone functionality with custom naming support
  - Added `CloneTemplateDialog` component with rename input
  - Integrated `ShareTemplateButton` dropdown menu (share, delete actions)
  - Added AlertDialog component for confirmations
  - Templates navigation link in user dropdown and guest header
  - Full data isolation: clones are independent, deletes don't cascade to clones
- **Skill Tree Deletion**:
  - DELETE endpoint with ownership verification and cascade delete
  - Destructive confirmation dialog with warnings for public templates
  - Dashboard integration with delete option in dropdown menu
- **AI-Generated Task Completion Checklists** (Phase 6):
  - Added `Task.checklistOptions` JSON field to database schema
  - Extended AI prompt to generate 3-6 context-aware checkbox options per task
  - Examples: Writing tasks → ["完成文案改写", "标题吸引力测试"], Coding tasks → ["代码已测试", "功能可演示"]
  - Updated TaskCompletionDialog with checkbox UI + auto-submission formatting
  - Fallback to rule-based options for legacy tasks without AI-generated checklists
  - Zero additional AI cost (options generated during initial skill tree creation)
  - Migration: `20251008043426_add_task_checklist_options`
  - New components: `components/ui/checkbox.tsx`, `lib/task-checklist.ts` (fallback rules)

- **Personalized AI Generation** (Phase 6):
  - Added collapsible "告诉我们更多" section with 3 optional natural language text fields
  - Background input: User's professional/educational background
  - Existing skills input: Skills already mastered (free-form text)
  - Learning preferences: Goals, resource preferences, constraints
  - Enhanced AI prompt with multi-dimensional context fusion
  - Smart personalization: Skip redundant content, match resources to learning style, adjust difficulty based on experience
  - New UI components: Alert, Collapsible (shadcn/ui)
  - Updated type definitions in `lib/ai.ts` and API schema validation

- **Earlier Changes**:
  - **Achievement Sorting**: Reordered achievements page to show easiest-to-unlock first (COMMON → RARE → EPIC → LEGENDARY)
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
  - **New Files**:
    - `components/skill-tree-card.tsx`: Card-based skill display component
    - `app/api/skills/[skillId]/route.ts`: Individual skill API endpoint

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
npm run build                 # Production build
npm start                     # Start production server
npm run lint                  # Run ESLint
```

### Deployment
```bash
npm run vercel-build          # Vercel build script (Prisma + Next.js)
./deploy.sh                   # One-click deployment to Vercel
vercel --prod                 # Manual Vercel deployment
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
   - Input: User goal, skill level, weekly hours + optional personalization (background, existing skills, learning preferences)
   - Output: 15-25 skills with dependencies, difficulty ratings (1-10), XP rewards, learning resources
   - Streaming mode: Real-time progress updates via Server-Sent Events (SSE)
   - Validates response with `SkillTreeResponseSchema` (Zod)
   - Personalization: AI adapts starting point, skips known skills, matches resources to learning style
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
  - Fields: order (for manual reordering), submission, notes, estimatedHours, checklistOptions (JSON array)
  - AI evaluation: qualityScore, aiFeedback
  - AI-generated: checklistOptions (3-6 context-aware completion checkboxes)

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
│   ├── skill-tree/[id]/
│   │   ├── route.ts                       # Fetch skill tree data, DELETE skill tree
│   │   ├── share/route.ts                 # Toggle template sharing (POST)
│   │   └── clone/route.ts                 # Clone template with custom name (POST)
│   ├── templates/route.ts                 # Fetch public templates (GET)
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
├── templates/page.tsx                     # Public template library
├── tree/[id]/page.tsx                     # Skill tree visualization page
├── layout.tsx                              # Root layout with header and navigation
└── page.tsx                                # Landing page with SkillTreeGenerator

components/
├── ui/                                     # shadcn/ui components (button, card, input, badge, select, alert, alert-dialog, checkbox, collapsible, etc.)
├── skill-tree-generator.tsx                # Main form with streaming progress + personalization inputs
├── skill-tree-canvas.tsx                   # Legacy React Flow visualization (deprecated)
├── skill-tree-simple.tsx                   # Current: Simple hierarchical card-based skill tree layout
├── task-completion-dialog.tsx              # Task completion modal with AI evaluation + checklist UI
├── task-create-dialog.tsx                  # Task creation modal with form validation
├── clone-template-dialog.tsx               # Template cloning with custom naming
├── share-template-button.tsx               # Dropdown menu for share/unshare/delete actions
└── user-nav.tsx                            # User navigation with stats display and dropdown

lib/
├── ai.ts               # AI client (generateSkillTreeStream with checklistOptions, evaluateTaskCompletion)
├── auth.ts             # NextAuth.js configuration with GitHub provider
├── gamification.ts     # XP formulas, leveling, streaks, achievement definitions
├── task-checklist.ts   # Fallback checklist options for legacy tasks
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

**Phase 2 (✅ COMPLETED)**: Interactive skill tree visualization, streaming AI generation, database integration

**Phase 3 (✅ COMPLETED)**: Full authentication (NextAuth.js), user dashboard, cloud sync

**Phase 4 (✅ COMPLETED)**: Gamification mechanics (XP calculation, leveling, achievement unlocks, streaks)

**Phase 5 (✅ COMPLETED)**: Task management enhancements (manual task creation, bulk operations, progress analytics)

**Phase 6 (✅ COMPLETED)**: Polish and UI improvements (hierarchical layout, responsive design, personalized AI generation, AI-generated task checklists)

**Phase 7 (✅ COMPLETED)**: Template sharing and management (public templates, cloning, deletion)

**Phase 8 (✅ COMPLETED)**: Advanced features (deployment, production optimization, achievement enhancements)

**Future Enhancements**: Animations, mobile optimization, additional gamification features

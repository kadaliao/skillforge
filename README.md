# SkillForge 🎮

**Transform your learning journey into an interactive skill tree**

SkillForge is an AI-powered personal growth tracking system that gamifies learning. Like a video game skill tree, you can visualize your progress, earn XP, unlock achievements, and level up your skills.

## ✨ Current Features

> **Last Updated:** 2025-10-08 15:30

### 🆕 Recent Updates
- **Template System** - Share skill trees as public templates, clone and customize community templates
- **Personalized AI Generation** - Optional context fields for background, existing skills, and learning preferences
- **Smart Skill Tree Adaptation** - AI skips redundant content, adjusts difficulty, matches resources to learning style
- **AI-Generated Task Checklists** - Context-aware completion checkboxes reduce manual typing

### Phase 1 - Core Foundation (✅ COMPLETED)

1. **Next.js 15.5.4 Setup**
   - TypeScript configuration
   - Tailwind CSS v4 styling
   - App Router with Turbopack
   - React 19

2. **Database & ORM**
   - Prisma ORM with PostgreSQL
   - Comprehensive schema design:
     - User authentication models
     - Skill tree system with self-referential dependencies
     - Task management (5 types: PRACTICE, PROJECT, STUDY, CHALLENGE, MILESTONE)
     - Activity logging (audit trail for all user actions)
     - Achievement tracking with rarity system
   - Gamification data (XP, levels, streaks)

3. **UI Components**
   - shadcn/ui integration (15+ components)
   - Components: Button, Card, Input, Badge, Progress, Avatar, Dialog, Dropdown, Tabs, AlertDialog
   - Toast notifications (Sonner)
   - Dark/light theme support (next-themes)
   - Responsive design

4. **AI Integration**
   - OpenAI SDK with Zod schema validation
   - **Streaming support** with Server-Sent Events (SSE) for real-time progress
   - Type-safe responses (Zod → TypeScript)
   - Compatible with any OpenAI-compatible API
   - Configurable max_tokens (default 16384, customizable via `OPENAI_MAX_TOKENS`)
   - Intelligent JSON repair for truncated responses
   - Endpoints:
     - `/api/ai/generate-tree-stream` (streaming with real-time progress)
     - `/api/ai/generate-tree` (legacy, non-streaming)
     - `/api/ai/evaluate-task` (task quality evaluation with submission analysis)
   - **Personalized learning paths** based on:
     - User's goal
     - Current skill level
     - Weekly time availability
     - Optional: Professional/educational background
     - Optional: Existing skills (natural language input)
     - Optional: Learning preferences and constraints
   - **Auto-generates tasks**: Each skill includes 3 progressive tasks (STUDY → PRACTICE → PROJECT)

5. **Landing Page**
   - Hero section with value proposition
   - Feature highlights
   - Interactive skill tree generator form with **real-time streaming progress**
   - Auto-redirect to visualization after generation

### Phase 2 - Interactive Skill Tree (✅ COMPLETED)

1. **Simple Hierarchical Visualization**
   - Clean card-based layout with level grouping (Level 1, Level 2, Level 3...)
   - **Clickable skill cards** - Opens side panel with tasks and progress details
   - Visual status colors: LOCKED (gray), AVAILABLE (blue), IN_PROGRESS (yellow), COMPLETED (green), MASTERED (purple)
   - Real-time XP and task completion progress bars on each card
   - **Prerequisite navigation**: Clickable ↑ badges show required skills
   - Responsive grid layout (3 columns on desktop, 1 on mobile)
   - Side task panel with task management features

2. **Database Integration**
   - AI-generated skill trees saved to PostgreSQL
   - Prerequisite relationship mapping
   - Automatic hierarchical level calculation using topological sort
   - Auto-redirect to tree visualization after generation

3. **API Endpoints**
   - `/api/skill-tree/[id]` - Fetch/delete skill tree with all skills and prerequisites
   - `/api/skill-tree/[id]/share` - Toggle template sharing (public/private)
   - `/api/skill-tree/[id]/clone` - Clone template with custom naming
   - `/api/templates` - Fetch public template library
   - `/tree/[id]` - Server-rendered skill tree visualization page
   - `/templates` - Public template gallery page
   - `/api/ai/generate-tasks` - Generate AI tasks for skills without tasks

4. **Streaming Progress Display**
   - Real-time console-like UI showing AI generation progress
   - Token counting and duration metrics
   - Step-by-step feedback (generating, parsing, saving, connecting dependencies)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```bash
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32

# GitHub OAuth (Get from: https://github.com/settings/developers)
AUTH_GITHUB_ID="your-github-oauth-client-id"
AUTH_GITHUB_SECRET="your-github-oauth-client-secret"

OPENAI_API_KEY="your-openai-api-key"
# Optional: Custom API endpoint for OpenAI-compatible services
OPENAI_BASE_URL="https://api.openai.com/v1"
# Optional: Model name, defaults to gpt-4o
OPENAI_MODEL="gpt-4o"
# Optional: Max tokens for AI generation (default: 16384)
OPENAI_MAX_TOKENS="16384"
```

3. Generate Prisma Client:
```bash
npx prisma generate
```

4. Run migrations and seed achievements:
```bash
npx prisma migrate dev          # Apply database migrations
npx tsx prisma/seed-achievements.ts  # Seed 12 predefined achievements
```

5. Start development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🛠️ Development Commands

### Database Management
```bash
npx prisma generate           # Generate Prisma client after schema changes
npx prisma migrate dev        # Create and apply database migrations
npx prisma studio            # Open Prisma Studio (database GUI)
```

### Build & Run
```bash
npm run dev                   # Start dev server with Turbopack
npm run build                 # Production build
npm start                     # Start production server
npm run lint                  # Run ESLint
```

### Claude Code Commands (when using [claude.ai/code](https://claude.com/code))
```bash
/sync-status                  # Update CLAUDE.md with current project status
/sync-all                     # Sync status to both CLAUDE.md and README.md
```

### Phase 3 - Authentication & User Dashboard (✅ COMPLETED)

1. **NextAuth.js v5 Authentication**
   - GitHub OAuth provider integration
   - JWT session strategy (edge runtime compatible)
   - Protected routes via middleware
   - User data persisted to database via Prisma adapter

2. **User Dashboard** (`/dashboard`)
   - Stats overview: Total trees, skills, completion percentage
   - Grid view of all user's skill trees with progress bars
   - Direct links to skill tree visualizations
   - Empty state with CTA to create first tree

3. **Authentication UI**
   - Sign-in page with GitHub OAuth (`/auth/signin`)
   - User navigation component with avatar dropdown
   - Sign-out functionality
   - Sticky header with navigation

4. **Cloud Sync**
   - All skill trees automatically linked to authenticated users
   - API routes require authentication
   - User-specific data isolation
   - Removed demo user - all data is user-owned

### Phase 4 - Gamification Mechanics (✅ COMPLETED)

1. **XP & Leveling System**
   - Exponential XP formulas for user and skill progression
   - User leveling: 100 XP × 1.5^(level-1)
   - Skill leveling: 50 XP × 1.3^(level-1)
   - Real-time XP calculation and level updates

2. **Task Completion System**
   - Full progression API: `/api/tasks/[taskId]/complete`
   - Awards XP → Updates skill progress → Checks level ups → Unlocks prerequisites
   - Optional AI evaluation for task submissions (quality scoring 1-10)
   - Adjusted XP rewards based on submission quality

3. **Achievement System**
   - 12 predefined achievements across 4 rarity tiers:
     - COMMON: First Steps, Tree Planter, Task Master
     - RARE: Week Warrior (7-day streak), Dedicated Learner (10 skills), Rising Star (Level 10)
     - EPIC: Month Master (30-day streak), Knowledge Seeker (50 skills), Tree Master
     - LEGENDARY: Unstoppable (100-day streak), Grandmaster (Level 50), Polymath (100 skills)
   - Auto-detection and awarding on task completion
   - Achievement showcase page at `/achievements` (sorted easiest-to-unlock first)

4. **Streak Tracking**
   - Daily activity tracking with 48-hour grace period
   - Current streak and longest streak counters
   - Fire icon indicator in header navigation

5. **Interactive UI**
   - Clickable skill nodes with side task panel
   - Task completion dialog with submission/notes fields
   - Real-time progress updates after task completion
   - Toast notifications for level ups, achievements, and skill unlocks
   - Header displays: User level badge, total XP, current streak
   - Tooltips explaining gamification metrics

### Phase 5 - Task Management & Analytics (✅ COMPLETED)

1. **Manual Task Management**
   - Create custom tasks with `POST /api/tasks` endpoint
   - Edit tasks with `PUT /api/tasks/[taskId]`
   - Delete tasks with `DELETE /api/tasks/[taskId]`
   - Task creation dialog with validation (title, type, XP reward, estimated hours)
   - Task ordering with `order` field for manual reordering
   - Integrated "+ Add Task" button in skill tree task panel

2. **Bulk Operations**
   - Bulk complete: `POST /api/tasks/bulk-complete` (up to 50 tasks)
   - Bulk delete: `DELETE /api/tasks/bulk-delete` (up to 100 tasks)
   - Task reordering: `PUT /api/tasks/reorder` with atomic transactions
   - Checkbox selection UI with bulk actions toolbar
   - Simplified logic: Bulk complete awards base XP only (no AI evaluation for speed)

3. **Progress Analytics**
   - XP progression endpoint: `GET /api/analytics/progress?days=30`
   - Daily XP aggregation with cumulative tracking
   - Time range views: 7/14/30/90 days
   - Summary stats: Total XP gained, days active, avg XP per day

4. **Skills Analytics**
   - Completion stats endpoint: `GET /api/analytics/skills`
   - Status breakdown: LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED → MASTERED
   - Tree-level completion rates
   - Task completion percentages

5. **Analytics Dashboard** (`/analytics`)
   - Tabbed interface: XP Progress + Skills & Tasks
   - Daily XP bar chart (last 30 days)
   - Cumulative XP line chart with hover tooltips
   - Skills by status distribution with color-coded bars
   - Progress by skill tree with completion rates
   - Navigation: "View Analytics" button in dashboard header

### Phase 6 - Polish & UI Improvements (✅ COMPLETED)

- [x] **UI/UX Overhaul** - Replaced complex React Flow with simple card layout
- [x] **Hierarchical Skill Tree** - Level-based grouping with prerequisite arrows
- [x] **Consistent Layout** - Unified spacing and responsive design across all pages
- [x] **Improved Navigation** - Cleaner header, optimized buttons, mobile-friendly
- [x] **Personalized AI Generation** - Multi-dimensional context input
  - Collapsible optional section with 3 natural language text fields
  - Background, existing skills, and learning preferences
  - AI adapts starting point, skips known content, matches resources to learning style
- [x] **AI-Generated Task Checklists** - Context-aware completion checkboxes reduce manual typing
  - Examples: Writing tasks → ["完成文案改写", "标题吸引力测试"], Coding tasks → ["代码已测试", "功能可演示"]
  - Zero additional AI cost (generated during initial skill tree creation)
  - Fallback to rule-based options for legacy tasks

### Phase 7 - Template Sharing & Management (✅ COMPLETED)

- [x] **Public Template Library** - Browse community-shared skill trees at `/templates`
- [x] **Template Sharing** - Share your skill trees as public templates
- [x] **Template Cloning** - Clone templates with custom naming
- [x] **Skill Tree Deletion** - Delete your own skill trees with confirmation
- [x] **Data Isolation** - Cloned trees are fully independent (unshare/delete doesn't affect clones)
- [x] **Navigation Integration** - Templates link accessible to all users

## 📋 Roadmap

### Phase 8 - Advanced Features (NEXT)

- [ ] Framer Motion animations
  - Level up effects
  - Skill unlock animations
  - Achievement notifications
- [ ] Touch gestures for mobile
- [ ] Performance optimization
- [ ] Production deployment (Vercel)

## 🛠 Tech Stack

**Frontend:**
- Next.js 15.5.4 with Turbopack
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Simple hierarchical card-based UI (replaced React Flow for better UX)
- Framer Motion (animations - planned for Phase 6)

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL

**AI:**
- OpenAI API (GPT-4o)
- Zod schema validation for type-safe responses
- Compatible with any OpenAI-compatible API

**State Management:**
- Zustand

**Authentication:**
- NextAuth.js v5 with GitHub OAuth
- JWT session strategy (edge runtime compatible)

**Deployment:**
- Vercel (planned)

## 📊 Database Schema

Key models:
- **User**: Authentication + gamification stats (totalXP, level, currentStreak, longestStreak)
  - Relations: SkillTree, Activity, UserAchievement, Account, Session (NextAuth)
- **SkillTree**: Container for learning paths (name, domain, isTemplate, isPublic, aiGenerated)
  - Belongs to User, has many Skills
- **Skill**: Individual learning units with self-referential dependencies
  - Status: LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED → MASTERED
  - Leveling: currentLevel, maxLevel, currentXP, xpToNextLevel
  - Visual: positionX/positionY for React Flow rendering
- **Task**: Actionable items to complete skills
  - Types: PRACTICE, PROJECT, STUDY, CHALLENGE, MILESTONE
  - Fields: order (for manual reordering), submission, notes, estimatedHours, checklistOptions (JSON array)
  - AI evaluation: qualityScore, aiFeedback
  - AI-generated: 3-6 context-aware completion checkboxes
- **Activity**: Audit log for all user actions (TASK_COMPLETE, STUDY_SESSION, LEVEL_UP, etc.)
  - Tracks XP gains, duration, timestamps
- **Achievement** + **UserAchievement**: Badge system with rarity (COMMON, RARE, EPIC, LEGENDARY)

## 🎯 Core AI Features

### Skill Tree Generation (`/api/ai/generate-tree-stream`)
- **Input**: User goal, skill level, weekly hours + optional personalization
  - Optional: Professional/educational background (natural language)
  - Optional: Existing skills (free-form text)
  - Optional: Learning preferences and constraints (natural language)
- **Output**: 12-15 skills with dependencies, difficulty ratings (1-10), XP rewards, learning resources
- **Each skill includes 3 auto-generated tasks**: Progressive difficulty (STUDY → PRACTICE → PROJECT)
- **Personalization**: AI adapts starting point, skips known skills, matches resources to learning style
- **Streaming Mode**: Real-time progress updates via Server-Sent Events (SSE)
  - Shows token generation progress
  - Reports parsing and validation steps
  - Displays database save operations
  - Intelligent JSON repair for truncated responses
- **Architecture**:
  - OpenAI streaming API with `stream: true` and configurable `max_tokens` (default 16384)
  - Multi-dimensional context fusion in AI prompt
  - Validates response with `SkillTreeResponseSchema` (Zod)
  - Saves generated trees to PostgreSQL with prerequisite relationships and tasks
  - Type-safe TypeScript output inferred from schema

### Task Evaluation (`/api/ai/evaluate-task`)
- **Input**: Task details, user submission, base XP
- **Output**: Quality score (1-10), adjusted XP, constructive feedback, improvement suggestions
- **Architecture**: Validates response with `TaskEvaluationSchema` (Zod)

**Benefits**:
- Type-safe responses (Zod infers TypeScript types from schemas)
- Reliable JSON parsing (OpenAI's structured outputs)
- Works with any OpenAI-compatible API (set `OPENAI_BASE_URL`)

## 🤝 Contributing

This is a learning project. Feel free to explore the code and suggest improvements!

## 📝 License

MIT

---

**Built with ❤️ using Claude Code**

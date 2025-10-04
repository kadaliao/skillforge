# SkillForge 🎮

**Transform your learning journey into an interactive skill tree**

SkillForge is an AI-powered personal growth tracking system that gamifies learning. Like a video game skill tree, you can visualize your progress, earn XP, unlock achievements, and level up your skills.

## ✨ Current Features

> **Last Updated:** 2025-10-07 00:30

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
   - shadcn/ui integration (10+ components)
   - Components: Button, Card, Input, Badge, Progress, Avatar, Dialog, Dropdown, Tabs
   - Toast notifications (Sonner)
   - Dark/light theme support (next-themes)
   - Responsive design

4. **AI Integration**
   - OpenAI SDK with Zod schema validation
   - **Streaming support** with Server-Sent Events (SSE) for real-time progress
   - Type-safe responses (Zod → TypeScript)
   - Compatible with any OpenAI-compatible API
   - Endpoints:
     - `/api/ai/generate-tree-stream` (streaming with real-time progress)
     - `/api/ai/generate-tree` (legacy, non-streaming)
     - `/api/ai/evaluate-task` (task quality evaluation)
   - Intelligent learning path creation based on:
     - User's goal
     - Current skill level
     - Weekly time availability
     - Learning preferences

5. **Landing Page**
   - Hero section with value proposition
   - Feature highlights
   - Interactive skill tree generator form with **real-time streaming progress**
   - Auto-redirect to visualization after generation

### Phase 2 - Interactive Skill Tree (✅ COMPLETED)

1. **React Flow Visualization**
   - Custom SkillNode components with progress indicators
   - Interactive canvas with zoom, pan, and minimap controls
   - Visual status colors: LOCKED (gray), AVAILABLE (blue), IN_PROGRESS (yellow), COMPLETED (green), MASTERED (purple)
   - Real-time XP and task completion progress bars
   - Animated edges for skills in progress

2. **Database Integration**
   - AI-generated skill trees saved to PostgreSQL
   - Prerequisite relationship mapping
   - Skill positioning for React Flow layout (4-column grid)
   - Demo user auto-creation for testing

3. **API Endpoints**
   - `/api/skill-tree/[id]` - Fetch skill tree with all skills and prerequisites
   - `/tree/[id]` - Server-rendered skill tree visualization page

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
NEXTAUTH_SECRET="your-secret-key"
OPENAI_API_KEY="your-openai-api-key"
# Optional: Custom API endpoint for OpenAI-compatible services
OPENAI_BASE_URL="https://api.openai.com/v1"
# Optional: Model name, defaults to gpt-4o
OPENAI_MODEL="gpt-4o"
```

3. Generate Prisma Client:
```bash
npx prisma generate
```

4. Run migrations (when database is available):
```bash
npx prisma migrate dev
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

## 📋 Roadmap

### Phase 3 - User System & Data Persistence (NEXT)

- [ ] NextAuth.js authentication
  - Email/password login
  - OAuth providers (Google, GitHub)
- [ ] User dashboard
- [ ] Save/load skill trees
- [ ] Cloud sync functionality

### Phase 4 - Gamification

- [ ] XP calculation system
- [ ] Level progression
- [ ] Skill unlocking mechanism
- [ ] Achievement system
- [ ] Streak tracking
- [ ] Progress statistics dashboard

### Phase 5 - Task Management

- [ ] Create tasks for skills
- [ ] Complete tasks and earn XP
- [ ] AI-powered task evaluation
- [ ] Task difficulty estimation
- [ ] Learning resource recommendations

### Phase 6 - Polish & Deploy

- [ ] Framer Motion animations
  - Level up effects
  - Skill unlock animations
  - Achievement notifications
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Production deployment (Vercel)

## 🛠 Tech Stack

**Frontend:**
- Next.js 15.5.4 with Turbopack
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- @xyflow/react (skill tree visualization)
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
- NextAuth.js v5

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
  - AI evaluation: qualityScore, aiFeedback
- **Activity**: Audit log for all user actions (TASK_COMPLETE, STUDY_SESSION, LEVEL_UP, etc.)
  - Tracks XP gains, duration, timestamps
- **Achievement** + **UserAchievement**: Badge system with rarity (COMMON, RARE, EPIC, LEGENDARY)

## 🎯 Core AI Features

### Skill Tree Generation (`/api/ai/generate-tree-stream`)
- **Input**: User goal, skill level, weekly hours, preferences
- **Output**: 15-25 skills with dependencies, difficulty ratings (1-10), XP rewards, learning resources
- **Streaming Mode**: Real-time progress updates via Server-Sent Events (SSE)
  - Shows token generation progress
  - Reports parsing and validation steps
  - Displays database save operations
- **Architecture**:
  - OpenAI streaming API with `stream: true`
  - Validates response with `SkillTreeResponseSchema` (Zod)
  - Saves generated trees to PostgreSQL with prerequisite relationships
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

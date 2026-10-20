# FitBuddy — Team Handover & Developer Context Guide
**SMU IS216 Web Application Development II (WAD2)**  
**Repository:** [github.com/elnathanshee/WAD2-FitBuddy](https://github.com/elnathanshee/WAD2-FitBuddy)  
**Main Branch Status:** `STABLE & DEPLOYED` (Vercel Serverless + Neon PostgreSQL)  

---

## 📌 1. Project Overview & Current State

Welcome team! **FitBuddy** is a full-stack social fitness and habit accountability platform. The core architecture is completely built, verified, and running on Neon Serverless PostgreSQL and Vercel.

### 🌟 What Has Been Built & Is Fully Working:
1. **User Authentication & Multi-User Accounts:**
   - Salted `scrypt` password hashing + stateless HMAC-SHA256 JWT tokens.
   - Login, Signup, Remember Me, and Session persistence.
   - **1-Click Test Athlete Switcher:** Instant buttons on the login page and navbar for rapid grading and multi-account testing.
2. **Interactive Fitness & Habits Dashboard (`/dashboard`):**
   - Active streak tracking, weekly consistency rates, and quick habit shortcuts.
   - Live integrated widgets: Wearable Sync, Consistency Matrix, and Challenges.
3. **Wearable Health Sync Simulator (Apple Health & Google Fit):**
   - Real-time biometric simulation (Steps, Active Distance km, Active Calories kcal, Workout mins).
   - Automatically writes verified check-in records with JSONB telemetry to Neon PostgreSQL.
4. **7-Day Consistency Analytics & Habit Heatmap:**
   - Day-by-day performance matrix with trend indicators (Improving / Steady / Needs Focus).
5. **Friend Challenges & Head-to-Head Duels:**
   - Social duels against rivals with dual progress bar split visualization.
6. **Habits Tracker Suite (`/habits`):**
   - Full CRUD, category filtering (Fitness, Nutrition, Mindfulness, Recovery), 7-day interactive check-in dot matrix, and streak calculators.
7. **Gemini AI Goal Coach (`AiGoalCoachModal.vue`):**
   - Google Gemini 2.5 Flash integration generating personalized SMART training plans and atomic habit recommendations with 1-click database import.
8. **Weekly Social Leaderboard & Confetti Cheers (`/leaderboard`):**
   - Live weekly points computed directly from PostgreSQL check-ins.
   - Gold/Silver/Bronze podium styling, cheer/nudge buttons with `canvas-confetti` animations, and activity inbox.

---

## 🚀 2. Quickstart: Running the App Locally

### Prerequisites
- **Node.js:** v20.0.0 or higher (`node -v`)
- **Git**

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/elnathanshee/WAD2-FitBuddy.git
cd WAD2-FitBuddy

# 2. Install root dependencies
npm install

# 3. Install frontend dependencies
npm --prefix FitBuddy install --include=dev
```

### Environment Configuration
Create a `.env.local` file in the project root (or `server/.env`):
```env
# Neon Serverless PostgreSQL Connection String
DATABASE_URL="postgresql://neondb_owner:npg_12oBcxTivW4P@ep-wild-haze-13789239-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secret for Session Authentication
JWT_SECRET="wad2_fitbuddy_secret_jwt_key_2026"

# Optional: Google Gemini API Key for AI Goal Coach
# (If omitted, users can enter their own key in the AI Coach modal UI)
GEMINI_API_KEY=""

PORT=3000
NODE_ENV=development
```

### Running Locally
You can run the full-stack app in either of two ways:

#### Option A: Run Backend API + Frontend Dev Server (Recommended)
```bash
# Terminal 1: Run Express Backend API (Port 3000)
node --env-file-if-exists=.env.local server/server.js

# Terminal 2: Run Vue 3 Vite Frontend (Port 5173)
npm --prefix FitBuddy run dev
```
Open your browser at `http://localhost:5173`. Vite will automatically proxy `/api` requests to `http://localhost:3000`.

#### Option B: Build & Test Production Bundle Locally
```bash
# 1. Build production assets
npm run build

# 2. Run automated endpoint verification test suite (11 tests)
node --env-file-if-exists=.env.local scripts/verifyAllEndpoints.js
```

---

## 👥 3. Test Athlete Accounts (For Testing & Demo)

The Neon database is pre-seeded with 5 test athlete accounts. You can log in using the 1-click buttons or with these credentials:

| Athlete Name | Email | Default Password | Role / Persona |
|---|---|---|---|
| **You (Demo User)** | `demo@fitbuddy.com` | `password123` | Primary student athlete |
| **Alex Tan** | `alex@fitbuddy.com` | `password123` | Track & Field Sprinter |
| **Bernice Lim** | `bernice@fitbuddy.com` | `password123` | CrossFit & HIIT Enthusiast |
| **Charlie Wong** | `charlie@fitbuddy.com` | `password123` | Marathon Runner |
| **David Lee** | `david@fitbuddy.com` | `password123` | Powerlifter & Strength Coach |

*(You can also register any new account on `/signup`; passwords will be securely hashed with `scrypt`.)*

---

## 📂 4. Repository Structure & Dual-Root Architecture

```
WAD2-FitBuddy/
├── api/
│   └── index.js               # Vercel serverless function entrypoint (repo root)
├── server/                    # Express 5 REST API Backend
│   ├── config/
│   │   └── neon.js            # Neon PostgreSQL connection & auto-schema init
│   ├── controllers/
│   │   ├── authController.js           # scrypt auth & login/signup
│   │   ├── neonHabitController.js      # Habit CRUD & check-ins
│   │   ├── neonLeaderboardController.js# Weekly scores, rankings & cheers
│   │   ├── healthSyncController.js     # Apple Health & Google Fit sync
│   │   ├── analyticsController.js      # 7-day consistency calculation
│   │   ├── challengeController.js      # Head-to-head friend duels
│   │   └── aiController.js             # Google Gemini 2.5 Flash Coach
│   ├── middleware/
│   │   └── requireUser.js     # Bearer token JWT verification
│   ├── routes/                # Express API routes (/api/auth, /api/habits, etc.)
│   ├── utils/
│   │   └── auth.js            # scrypt password hashing & HMAC-SHA256 JWT
│   ├── app.js                 # Express application instance
│   └── server.js              # Local Node server entrypoint
│
├── FitBuddy/                  # Frontend Application (Vue 3 + Bootstrap 5)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/          # LoginPage.vue, SignupPage.vue
│   │   │   ├── dashboard/     # FitnessTrackerWidget, ConsistencyMatrix, Challenges
│   │   │   ├── habits/        # HabitCard, AddHabitModal, AiGoalCoachModal
│   │   │   ├── leaderboard/   # LeaderboardPodium, LeaderboardTable
│   │   │   └── Navbar.vue     # Global top navigation & quick user switcher
│   │   ├── views/             # Dashboard.vue, HabitsPage.vue, Leaderboard.vue
│   │   ├── services/          # api.js, authService.js
│   │   ├── router/            # Vue Router 4 with route guards (requiresAuth)
│   │   ├── App.vue
│   │   └── main.js
│   ├── api/index.js           # Subfolder Vercel entrypoint (for dual-root)
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│   ├── build.js               # Production build script for Vercel
│   ├── verifyAllEndpoints.js  # 11-step backend test suite
│   ├── captureScreenshots.js  # Automated browser screenshot capture runner
│   └── generatePdf.js         # Playwright PDF generator
│
├── FitBuddy_Project_Documentation.pdf # Comprehensive 14-page project documentation
├── TEAM_HANDOVER.md           # This document
└── vercel.json                # Vercel routing & build configuration
```

> ⚠️ **Note on Dual-Root Architecture:**  
> When deploying to Vercel, some developers set Root Directory to `./` while others set it to `FitBuddy`. Our setup has **dual-root compatibility**:
> - `scripts/build.js` automatically detects whether it's run from `./` or `FitBuddy` and compiles the assets accordingly.
> - Backend routes are accessible whether Vercel deploys from the root or subfolder.

---

## 🗄️ 5. Database Schema (Neon PostgreSQL)

All tables are automatically verified and created on startup if they don't exist:

1. **`users`**:
   - `user_id` (VARCHAR PK), `display_name` (VARCHAR), `email` (VARCHAR UNIQUE), `password_hash` (TEXT), `avatar_color` (VARCHAR), `created_at`, `updated_at`.
2. **`habits`**:
   - `id` (SERIAL PK), `user_id` (VARCHAR FK), `name` (VARCHAR), `category` (VARCHAR), `frequency` (VARCHAR), `target_amount` (INT), `target_unit` (VARCHAR), `icon` (VARCHAR), `color` (VARCHAR), `archived` (BOOLEAN).
3. **`check_ins`**:
   - `id` (SERIAL PK), `habit_id` (INT FK), `user_id` (VARCHAR FK), `date` (VARCHAR YYYY-MM-DD), `count` (INT), `notes` (TEXT), `telemetry` (JSONB).
4. **`cheers`**:
   - `id` (SERIAL PK), `sender_id` (VARCHAR FK), `recipient_id` (VARCHAR FK), `type` (VARCHAR: `cheer`, `nudge`, `fire`, `celebrate`), `message` (TEXT), `created_at`.
5. **`challenges`**:
   - `id` (SERIAL PK), `creator_id` (VARCHAR FK), `opponent_id` (VARCHAR FK), `title` (VARCHAR), `habit_category` (VARCHAR), `target_days` (INT), `creator_progress` (INT), `opponent_progress` (INT), `status` (VARCHAR: `active`, `completed`).

---

## 🌐 6. Key API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server health check (`{ status: "ok" }`) |
| `GET` | `/api/auth/demo-users` | No | Returns seeded demo accounts for 1-click login |
| `POST` | `/api/auth/login` | No | Logs in user, returns JWT and user profile |
| `POST` | `/api/auth/signup` | No | Registers new account with `scrypt` hashing |
| `GET` | `/api/auth/me` | Yes (`Bearer`) | Returns current authenticated profile |
| `GET` | `/api/habits` | Yes (`Bearer`) | Fetches all active habits for the logged-in user |
| `POST` | `/api/habits` | Yes (`Bearer`) | Creates a new habit |
| `POST` | `/api/habits/:id/check-in` | Yes (`Bearer`) | Logs or toggles completion for a specific date |
| `GET` | `/api/leaderboard/weekly` | Yes (`Bearer`) | Dynamic weekly leaderboard rankings and points |
| `POST` | `/api/leaderboard/cheer` | Yes (`Bearer`) | Sends a cheer/nudge to a fellow athlete |
| `GET` | `/api/leaderboard/cheers` | Yes (`Bearer`) | Gets latest cheers received by current user |
| `POST` | `/api/health-sync/simulate` | Yes (`Bearer`) | Simulates Apple Health / Google Fit sync |
| `GET` | `/api/analytics/summary?period=day\|week\|month&offset=0&today=YYYY-MM-DD` | Yes (`Bearer`) | Analytics Dashboard: completion rates, per-day breakdown, streaks, category counts |
| `GET` | `/api/analytics/weekly-summary` | Yes (`Bearer`) | 7-day completion rates & category counts |
| `GET` | `/api/challenges` | Yes (`Bearer`) | Lists active and completed friend challenges |
| `POST` | `/api/challenges` | Yes (`Bearer`) | Creates a new head-to-head challenge |
| `POST` | `/api/ai/suggest-habits` | Yes (`Bearer`) | Google Gemini 2.5 Flash habit recommendation |

---

## 🛠️ 7. Coding Guidelines for Team Members

1. **Follow IS216 Syllabus Standards:**
   - **Frontend:** Use Vue 3 `<script setup>` Composition API. Do NOT use legacy Options API.
   - **Styling:** Use Bootstrap 5 classes and Bootstrap Icons (`bi bi-*`). Avoid introducing bloated heavy UI libraries.
   - **HTTP Requests:** Use the shared Axios client in `FitBuddy/src/services/api.js` which automatically attaches JWT tokens.
2. **Database Queries:**
   - Always use parameterized tagged templates (`sql\`SELECT ... WHERE user_id = ${userId}\``) to prevent SQL injection.
3. **Keep Commits Clean:**
   - Run `node scripts/build.js` before pushing to verify that Vite compiles cleanly.
   - Run `node --env-file-if-exists=.env.local scripts/verifyAllEndpoints.js` to ensure zero API regressions.

---

## 💡 8. Potential Next Features / Ideas for Teammates

If teammates are looking for items to build next, here are great ideas:
- [ ] **Custom Profile Picture Upload:** Integrate with Neon S3 Object Storage (`assets` bucket) for user avatars.
- [ ] **Habit Streaks Badges:** Add milestone unlockables (e.g. "7-Day Warrior", "Hydration Master").
- [ ] **Export to CSV / PDF:** Allow users to download a summary report of their monthly fitness logs.
- [ ] **Push / Toast Notifications:** In-app popups when a friend cheers or nudges you while on the app.

---
*Questions or issues? Reach out on our group chat or check the full generated documentation in `FitBuddy_Project_Documentation.pdf`.*

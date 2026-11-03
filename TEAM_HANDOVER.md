# FitBuddy — Team Handover & Developer Context Guide
**SMU IS216 Web Application Development II (WAD2)**  
**Repository:** [github.com/elnathanshee/WAD2-FitBuddy](https://github.com/elnathanshee/WAD2-FitBuddy)  
**Main Branch Status:** `STABLE & DEPLOYED` (Vercel Serverless + Neon PostgreSQL) — last updated 3 Nov 2026  
**Deadline:** Fri 6 Nov 2026, 9am. Live app: https://wad-2-fit-buddy.vercel.app  

> 📖 **Setup, run and test steps and the demo logins live in the root [`README.md`](README.md).** This guide covers the "why" and the layout; short commands are repeated below for convenience.

### 🔧 What changed in the Nov 2026 refactor & latest additions
If your files look different from last week, this is why:
- **Pinia stores** (`FitBuddy/src/stores/`) now hold shared state (auth, theme, friend-request badge, coach chat, Google Health updates).
- **Plain Axios + `authConfig()`**: every service passes `authConfig()` to `axios.get/post/put/delete`.
- **Week 11 route guard** in `router/index.js`: protected routes use `meta: { requiresAuth: true }`, logged-out users go to `/login?redirect=...` and come back after login.
- **Big components were split**: Navbar (`components/navbar/`), Leaderboard (`components/leaderboard/`), CoachChat (CoachPanel / CoachMessage / CoachSuggestion) and the Home carousel (HighlightSlide).
- **MongoDB path removed** from the backend (Neon PostgreSQL only); backend unit tests now run on **Vitest**.
- **Latest Feature Additions (3 Nov 2026):**
  1. **Day-Ending / Time Running Out Notification (`DayEndingBanner.vue`, `NotificationModal.vue`, `POST /api/notifications/day-ending`):** Shows a Bootstrap warning alert countdown (`Only Xh Ym left before the day ends`) on Home and Habits when habits are unfinished for today, automatically triggers a push/browser alert when time is running out, and offers one-click manual trigger in the banner and Notifications modal.
  2. **Custom Day(s) for Weekly Habits (`HabitFormModal.vue`, `HabitCard.vue`, `habits.custom_days`):** Weekly habits can optionally specify custom scheduled days of the week (`Mon`–`Sun`) using Bootstrap toggle buttons, displayed on `HabitCard.vue` (with a `Scheduled today` badge) and `HomePage.vue`.
  3. **Habit Groups on Home Page (`GroupsSection.vue`):** Replaced Active Challenges on `HomePage.vue` with a Habit Groups card (`data-testid="home-groups"`) showing shared group activities, member check-in progress bars, one-click **Check in**, and a **New group** modal (while Friend Challenges remain accessible on `FriendsPage.vue`).
  4. **Simulated Google Health Data (`FitnessTrackerWidget.vue`, `healthSyncController.js`):** Google Health runs out-of-the-box with simulated wearable activity data (steps, active minutes, distance, calories) and workout presets (*Daily activity*, *Brisk walk*, *5K outdoor run*, *Gym / HIIT*) that automatically sync and log matching exercise habits in Neon PostgreSQL without needing Google OAuth credentials.

---

## 📌 1. Project Overview & Current State

Welcome team! **FitBuddy** is a full-stack social fitness and habit accountability platform. The core architecture is completely built, verified, and running on Neon Serverless PostgreSQL and Vercel.

### 🌟 What Has Been Built & Is Fully Working:
1. **User Authentication & Multi-User Accounts:**
   - Salted `scrypt` password hashing + stateless HMAC-SHA256 JWT tokens.
   - Login, Signup, Remember Me, and Session persistence.
   - **1-Click Test Athlete Switcher:** Instant buttons on the login page and navbar for rapid grading and multi-account testing.
   - Edit profile (name, avatar) and an appearance picker (light/dark and background) in the navbar account menu.
2. **Home (`/home`, the first page after login) and Dashboard (`/dashboard`):**
   - Home: today's habits and progress bar, day-ending countdown alert banner, habit groups (`GroupsSection.vue`), and the simulated Google Health card with its latest sync updates.
   - Dashboard: statistics only — completion rates, charts and streaks by day, week or month, plus a monthly heatmap.
3. **Google Health (Simulated Wearable Activity Data):**
   - Displays simulated steps, active minutes, distance and calories (`FitnessTrackerWidget.vue`) with one-click **Sync** and workout simulation presets (`walk`, `run`, `workout`) in the settings panel.
   - Syncing automatically logs or updates matching exercise/steps/run/workout habits in Neon PostgreSQL (`check_ins`).
4. **7-Day Consistency Analytics & Habit Heatmap:**
   - Day-by-day performance matrix with trend indicators.
5. **Habit Groups (`/groups` & Home page) & Friend Challenges (`/friends`):**
   - Create habit groups with friends, add shared group activities with points, check in from `/home` or `/groups`, and cheer group members.
   - Head-to-head friend challenges (`ChallengesSection.vue` on `/friends`) with invite accept/decline flow.
6. **Habits Tracker Suite (`/habits`):**
   - Full CRUD with categories (Exercise, Water, Sleep, Study, or a custom one), daily/weekly targets, optional **Custom days (`Mon`–`Sun`)** for weekly habits, progress logging with undo, history and streaks.
7. **Gemini AI Goal Coach chatbot (`CoachChat.vue`):**
   - Floating button in the bottom-right of the Habits page opens a chat. The user describes a goal; Google Gemini replies (multi-turn, it remembers the conversation) and suggests habits that can be added in one tap.
8. **Weekly Social Leaderboard & Confetti Cheers (`/leaderboard`):**
   - Live weekly points computed directly from PostgreSQL check-ins.
   - Gold/Silver/Bronze podium styling, cheer/nudge buttons with `canvas-confetti` animations, and activity inbox.
9. **Social & Friends (`/friends`, `/friends/:id`):**
   - Search athletes by name (or exact email), send friend requests, accept / decline / cancel them, remove friends, and challenge friends.
   - A friend's profile shows their week's completion rate, perfect-day streak, points, a dot for each day, and every habit with its progress and streak.
10. **Achievements & badges (`/achievements`):** streak and milestone badges with 3D medal/trophy visuals.
11. **Goal planner (`/goals`) and Meal planner (`/meals`):** pick a personal goal, get a matching habit plan, then meal ideas with ingredients and estimated macros.
12. **Notifications & Day-Ending Alerts:** OneSignal web push + local browser notifications, daily habit reminders, and automatic/manual **Time is Running Out / Day-Ending** alerts (`/api/notifications/day-ending`, `DayEndingBanner.vue`, `NotificationModal.vue`).

---

## 🚀 2. Quickstart: Running the App Locally

### Prerequisites
- **Node.js:** v20.0.0 or higher (`node -v`)
- **Git**

### Installation Steps
```bash
git clone https://github.com/elnathanshee/WAD2-FitBuddy.git
cd WAD2-FitBuddy

# Install per folder (root install is only needed for the Vercel build and scripts/)
cd server && npm install && cd ..
cd FitBuddy && npm install && cd ..
```

### Environment Configuration
The backend reads **`server/.env`** (copy `server/.env.example` to `server/.env`). It is loaded by the `npm run dev` / `npm start` scripts in `server/package.json`.
```env
# Neon Serverless PostgreSQL Connection String
DATABASE_URL="postgresql://<user>:<password>@<host>/neondb?sslmode=require"

# Optional: Google Gemini API Key for AI Goal Coach
GEMINI_API_KEY=""

# Optional: OneSignal Push Keys (falls back to simulated/local browser notifications when blank)
ONESIGNAL_APP_ID=""
ONESIGNAL_REST_API_KEY=""

PORT=3000
```
🔐 **Get the real values from the team group chat — never commit them.**

### Running Locally
```bash
# Terminal 1: Express backend API (http://localhost:3000)
cd server && npm run dev

# Terminal 2: Vue 3 Vite frontend (http://localhost:5173)
cd FitBuddy && npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:3000`.

#### Demo friendships (one-off)
```bash
# Adds the demo friends/request (additive, safe to repeat; never deletes anything)
cd server && npm run seed:friends
```

### Testing
```bash
# Backend unit tests (Vitest)
cd server && npm test

# End-to-end tests (Playwright, desktop + mobile projects)
cd FitBuddy && npx playwright test
```

---

## 👥 3. Test Athlete Accounts (For Testing & Demo)

The Neon database is pre-seeded with 5 test athlete accounts (`password123`):

| Athlete Name | Email | Default Password | Role / Persona |
|---|---|---|---|
| **You (Demo User)** | `demo@fitbuddy.com` | `password123` | Primary student athlete |
| **Alex Tan** | `alex@fitbuddy.com` | `password123` | Track & Field Sprinter |
| **Bernice Lim** | `bernice@fitbuddy.com` | `password123` | CrossFit & HIIT Enthusiast |
| **Charlie Wong** | `charlie@fitbuddy.com` | `password123` | Marathon Runner |
| **David Lee** | `david@fitbuddy.com` | `password123` | Powerlifter & Strength Coach |

---

## 📂 4. Repository Structure & Dual-Root Architecture

```
WAD2-FitBuddy/
├── api/index.js               # Vercel serverless function entrypoint (repo root)
├── server/                    # Express 5 REST API Backend (Neon PostgreSQL)
│   ├── config/                # neon.js (connection + auto-schema), onesignal.js, storage.js
│   ├── controllers/           # auth, neonHabit, neonLeaderboard, friend, challenge, group,
│   │                          # healthSync, analytics, achievements, notification, ai
│   ├── middleware/requireUser.js  # Bearer token JWT / x-user-id verification
│   ├── routes/                # Express routes (/api/auth, /api/habits, /api/groups, etc.)
│   ├── services/              # points, achievements, notification
│   ├── utils/                 # auth (scrypt + JWT), dates, streak, analytics, friends
│   ├── tests/                 # Vitest unit tests (*.test.js)
│   ├── app.js                 # Express application instance
│   ├── server.js              # Local Node server entrypoint
│   ├── seedNeon.js / seedFriends.js  # Demo data seeders
│   └── .env.example
│
├── FitBuddy/                  # Frontend Application (Vue 3 + Bootstrap 5)
│   ├── src/
│   │   ├── components/
│   │   │   ├── navbar/        # NavTabs, AccountMenu, AppearancePicker, DemoAthleteSwitcher
│   │   │   ├── leaderboard/   # LeaderboardPodium, LeaderboardRow, MyPointsCard, CheersInbox, LeaderboardToast
│   │   │   ├── habits/        # HabitCard, HabitFormModal, LogProgressModal, HabitHistoryModal,
│   │   │   │                  # AppModal, EmojiPickerField, CoachChat / CoachPanel / CoachMessage / CoachSuggestion, CoachFace
│   │   │   ├── dashboard/     # AnalyticsDashboard, MonthlyHeatmap, GroupsSection, ChallengesSection, FitnessTrackerWidget
│   │   │   ├── friends/       # FriendRow
│   │   │   ├── notifications/ # NotificationModal, DayEndingBanner
│   │   │   ├── profile/       # EditProfileModal
│   │   │   ├── three/         # StreakMedal3D, Trophy3D
│   │   │   └── Navbar, LoginPage, SignupPage, HighlightsCarousel, HighlightSlide, CountUp, BrandMark
│   │   ├── views/             # HomePage, Dashboard, HabitsPage, Leaderboard, FriendsPage, FriendProfile,
│   │   │                      # GroupsPage, AchievementsPage, GoalPlanner, MealPlanner
│   │   ├── stores/            # Pinia: auth, theme, friendRequests, coachChat, healthSync
│   │   ├── services/          # api.js (authConfig() helper) + one *Service.js per feature
│   │   ├── router/index.js    # Vue Router + Week 11 auth guard
│   │   ├── directives/        # motion.js (v-reveal, v-tilt)
│   │   ├── utils/             # dates, habitOptions, goalOptions, meal*, celebrate, three/
│   │   ├── App.vue
│   │   └── main.js
│   ├── e2e/                   # Playwright specs (challenges, coach-chat, experience, friends, habits, leaderboard, navigation)
│   ├── server/                # Mirror copy of /server (used if Vercel deploys from FitBuddy/)
│   ├── api/index.js           # Subfolder Vercel entrypoint (for dual-root)
│   ├── playwright.config.js
│   └── vite.config.js
│
├── scripts/
│   ├── build.js               # Production build script for Vercel (also copies server/ to FitBuddy/server/)
│   ├── captureScreenshots.js  # Automated browser screenshot capture runner
│   └── generatePdf.js         # Playwright PDF generator
│
├── docs/                      # google-health-setup.md etc.
├── README.md                  # Setup, run, test, demo logins, library credits
├── FitBuddy_Project_Documentation.pdf # Comprehensive project documentation
├── TEAM_HANDOVER.md           # This document
└── vercel.json                # Vercel routing & build configuration
```

---

## 🗄️ 5. Database Schema (Neon PostgreSQL)

All tables are automatically verified and created on startup if they don't exist:

1. **`users`**:
   - `user_id` (VARCHAR PK), `display_name` (VARCHAR), `email` (VARCHAR UNIQUE), `password_hash` (TEXT), `avatar_color` (VARCHAR), `primary_goal` (VARCHAR), `goal_target` (VARCHAR), `created_at`, `updated_at`.
2. **`habits`**:
   - `id` (SERIAL PK), `user_id` (VARCHAR FK), `name` (VARCHAR), `category` (VARCHAR), `frequency` (VARCHAR: `daily` | `weekly`), `custom_days` (VARCHAR: comma-separated `Mon,Tue,...` for weekly habits), `target_amount` (NUMERIC), `target_unit` (VARCHAR), `icon` (VARCHAR), `created_at`, `updated_at`.
3. **`check_ins`**:
   - `id` (SERIAL PK), `habit_id` (INT FK), `user_id` (VARCHAR FK), `date` (VARCHAR YYYY-MM-DD), `count` (NUMERIC), `created_at`, `updated_at`.
4. **`cheers`**:
   - `id` (SERIAL PK), `sender_id` (VARCHAR FK), `recipient_id` (VARCHAR FK), `type` (VARCHAR: `cheer`, `nudge`, `fire`, `celebrate`), `message` (TEXT), `created_at`, `sent_on` (DATE, Singapore day).
5. **`challenges`**:
   - `id` (SERIAL PK), `creator_id` (VARCHAR FK), `opponent_id` (VARCHAR FK), `title` (VARCHAR), `habit_category` (VARCHAR), `target_days` (INT), `creator_progress` (INT), `opponent_progress` (INT), `status` (VARCHAR: `pending`, `active`, `declined`, `completed`).
6. **`friendships`**:
   - `id` (SERIAL PK), `requester_id` (VARCHAR), `addressee_id` (VARCHAR), `status` (VARCHAR: `pending`, `accepted`), `created_at`, `responded_at`.
7. **`habit_groups`** / **`habit_group_members`**: a group (`name`, `owner_id`) and its members (`group_id`, `user_id`).
8. **`group_activities`** / **`group_activity_members`**: an activity inside a group (`title`, `start_date`, `end_date`, `points`) and the members taking part.
9. **`group_checkins`**: one check-in per (`activity_id`, `user_id`, `checkin_date`) with the `points` earned.
10. **`group_activity_cheers`**: a cheer from one group member to another for an activity, once per sender, recipient and day.

---

## 🌐 6. Key API Endpoints Reference

All routes below except where marked "No" sit behind `requireUser` (Bearer token).

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server health check (`{ status: "ok" }`) |
| `GET` | `/api/auth/demo-users` | No | Returns seeded demo accounts for 1-click login |
| `POST` | `/api/auth/login` | No | Logs in user, returns JWT and user profile |
| `POST` | `/api/auth/signup` | No | Registers new account with `scrypt` hashing |
| `GET` | `/api/auth/me` | Yes (`Bearer`) | Returns current authenticated profile |
| `PUT` | `/api/auth/profile` | Yes (`Bearer`) | Updates display name / avatar |
| `GET` / `PUT` | `/api/auth/goal` | Yes (`Bearer`) | Reads / saves the user's personal goal (Goal planner) |
| `GET` | `/api/habits` | Yes (`Bearer`) | Fetches all active habits (including `customDays` for weekly habits) |
| `POST` | `/api/habits` | Yes (`Bearer`) | Creates a new habit (`name`, `category`, `frequency`, `customDays`, `target`, `icon`) |
| `POST` | `/api/habits/:id/checkins` | Yes (`Bearer`) | Logs progress for a habit |
| `PUT` / `DELETE` | `/api/habits/:id/checkins/:date` | Yes (`Bearer`) | Sets or undoes the check-in for a specific date |
| `GET` | `/api/habits/:id/history` | Yes (`Bearer`) | A habit's check-in history |
| `GET` | `/api/leaderboard/weekly` | Yes (`Bearer`) | Dynamic weekly leaderboard rankings and points |
| `POST` | `/api/leaderboard/cheer` | Yes (`Bearer`) | Sends a cheer/nudge to a fellow athlete (**409** if already sent today) |
| `GET` | `/api/leaderboard/cheers` | Yes (`Bearer`) | Gets latest cheers received by current user |
| `GET` | `/api/friends` | Yes (`Bearer`) | Your `friends`, `incoming` requests and `outgoing` requests |
| `GET` | `/api/friends/search?q=` | Yes (`Bearer`) | Finds athletes by name or exact email |
| `POST` | `/api/friends/requests` | Yes (`Bearer`) | Sends a friend request |
| `POST` | `/api/friends/requests/:id/accept` | Yes (`Bearer`) | Accepts a friend request |
| `POST` | `/api/friends/requests/:id/reject` | Yes (`Bearer`) | Declines a friend request |
| `DELETE` | `/api/friends/requests/:id` | Yes (`Bearer`) | Cancels a request you sent |
| `DELETE` | `/api/friends/:userId` | Yes (`Bearer`) | Removes a friend |
| `GET` | `/api/friends/:userId/profile` | Yes (`Bearer`) | A friend's profile, weekly points and week analytics |
| `GET` / `POST` | `/api/groups` | Yes (`Bearer`) | Lists your groups / creates a group |
| `POST` | `/api/groups/:groupId/activities` | Yes (`Bearer`) | Adds a group activity |
| `POST` | `/api/groups/activities/:activityId/check-in` | Yes (`Bearer`) | Checks in to a group activity |
| `POST` | `/api/groups/activities/:activityId/cheer` | Yes (`Bearer`) | Cheers a group member |
| `GET` | `/api/achievements` | Yes (`Bearer`) | Achievements / badges and progress |
| `GET` | `/api/notifications/status` | Yes (`Bearer`) | Whether OneSignal push is configured |
| `POST` | `/api/notifications/remind-habits` | Yes (`Bearer`) | Sends habit reminders |
| `POST` | `/api/notifications/day-ending` | Yes (`Bearer`) | Sends urgent "Time is Running Out / Day Ending" notification |
| `GET` | `/api/health-sync/google/status` | Yes (`Bearer`) | Simulated Google Health connection status |
| `POST` | `/api/health-sync/google/connect` | Yes (`Bearer`) | Connects simulated Google Health feed |
| `POST` | `/api/health-sync/google/sync` | Yes (`Bearer`) | Simulates wearable sync (`preset`: `default`, `walk`, `run`, `workout`) and logs matching habits |
| `GET` | `/api/health-sync/today` | Yes (`Bearer`) | Today's simulated Google Health metrics |
| `DELETE` | `/api/health-sync/google/connection` | Yes (`Bearer`) | Pauses/disconnects Google Health feed |
| `GET` | `/api/analytics/summary` | Yes (`Bearer`) | Analytics Dashboard: completion rates, per-day breakdown, streaks, category counts |
| `GET` / `POST` | `/api/challenges` | Yes (`Bearer`) | Lists / creates head-to-head friend challenges |
| `POST` | `/api/ai/coach-chat` | Yes (`Bearer`) | Goal coach chatbot (`{ messages } -> { reply, suggestions }`) |

---

## 🛠️ 7. Coding Guidelines for Team Members

1. **Vue (follow the WAD2 slides):**
   - `<script setup>` only, no Options API. Use `ref` (not `reactive`), `computed` for derived values, `onMounted` for loading data.
   - Components talk through props/emits and slots (no `defineExpose`).
   - Shared state goes in a Pinia setup store in `src/stores/`.
   - Styling: Bootstrap 5 classes and Bootstrap Icons (`bi bi-*`). No heavy UI libraries.
2. **HTTP:** put calls in `src/services/*Service.js` as `axios.get/post/put/delete('/api/...', ..., authConfig())`.
3. **Routing:** add `meta: { requiresAuth: true }` to protected routes.
4. **Beyond the syllabus:** if you truly need `watch`, `onUnmounted` cleanup, `Teleport`, `Transition`, template refs or `nextTick`, add a `// Beyond WAD2 syllabus:` comment above it explaining why in plain English.
5. **Third-party libraries:** credit every one at its import with `// Third-party library: <name> (<url>) — used for …` and list it in the root `README.md`.
6. **Backend:** edit `server/` only, then sync to `FitBuddy/server/` (run `node scripts/build.js` from the root).

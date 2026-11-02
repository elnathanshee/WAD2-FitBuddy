# FitBuddy — Team Handover & Developer Context Guide
**SMU IS216 Web Application Development II (WAD2)**  
**Repository:** [github.com/elnathanshee/WAD2-FitBuddy](https://github.com/elnathanshee/WAD2-FitBuddy)  
**Main Branch Status:** `STABLE & DEPLOYED` (Vercel Serverless + Neon PostgreSQL) — last updated 3 Nov 2026  
**Deadline:** Fri 6 Nov 2026, 9am. Live app: https://wad-2-fit-buddy.vercel.app  

> 📖 **Setup, run and test steps and the demo logins live in the root [`README.md`](README.md).** This guide covers the "why" and the layout; short commands are repeated below for convenience.

### 🔧 What changed in the Nov 2026 refactor
If your files look different from last week, this is why:
- **Pinia stores** (`FitBuddy/src/stores/`) now hold shared state (auth, theme, friend-request badge, coach chat, Google Health updates). The old composables and `authService.js` are gone.
- **Plain Axios + `authConfig()`**: no more `axios.create` or interceptors; every service passes `authConfig()` to `axios.get/post/put/delete`.
- **Week 11 route guard** in `router/index.js`: protected routes use `meta: { requiresAuth: true }`, logged-out users go to `/login?redirect=...` and come back after login.
- **Big components were split**: Navbar (`components/navbar/`), Leaderboard (`components/leaderboard/`), CoachChat (CoachPanel / CoachMessage / CoachSuggestion) and the Home carousel (HighlightSlide).
- **MongoDB path removed** from the backend (Neon PostgreSQL only); backend unit tests now run on **Vitest**.
- **`// Beyond WAD2 syllabus:` comments** mark the few non-taught APIs we kept, and third-party libraries are credited at their imports.
- **Root `README.md` added** (setup, run, test, demo logins, library credits).

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
   - Home: today's habits and progress ring, active challenges, and the Google Health card with its latest sync updates.
   - Dashboard: statistics only — completion rates, charts and streaks by day, week or month, plus a monthly heatmap.
3. **Google Health connection (real OAuth, no simulator):**
   - Users connect their own Google Health account (`FitnessTrackerWidget.vue`); the server stores an encrypted refresh token and reads steps, active minutes, distance and calories on sync.
   - Only the habits the user maps are updated. Without the Google env vars the card shows its "Connect" / missing-setup state (see `docs/google-health-setup.md`).
4. **7-Day Consistency Analytics & Habit Heatmap:**
   - Day-by-day performance matrix with trend indicators (Improving / Steady / Needs Focus).
5. **Friend Challenges & Head-to-Head Duels:**
   - Social duels against rivals with dual progress bar split visualization.
   - Challenges are invites: the friend accepts or declines, and only friends can be challenged.
6. **Habits Tracker Suite (`/habits`):**
   - Full CRUD with categories (Exercise, Water, Sleep, Study, or a custom one), daily/weekly targets, progress logging with undo, history and streaks.
7. **Gemini AI Goal Coach chatbot (`CoachChat.vue`):**
   - Floating button in the bottom-right of the Habits page opens a chat. The user describes a goal; Google Gemini 3.5 Flash replies (multi-turn, it remembers the conversation) and suggests habits that can be added in one tap.
8. **Weekly Social Leaderboard & Confetti Cheers (`/leaderboard`):**
   - Live weekly points computed directly from PostgreSQL check-ins.
   - Gold/Silver/Bronze podium styling, cheer/nudge buttons with `canvas-confetti` animations, and activity inbox.
   - Friends' names link to their profile, and other athletes get an Add friend / Accept / Requested button.
9. **Social & Friends (`/friends`, `/friends/:id`):**
   - Search athletes by name (or exact email), send friend requests, accept / decline / cancel them, and remove friends (with a confirm popup).
   - A friend's profile shows their week's completion rate, perfect-day streak, points, a dot for each day, and every habit with its progress and streak. Only friends can open it (the API answers **403** otherwise) and emails are never sent to the browser.
10. **Groups (`/groups`):** create a group, add group activities with a date range and points, check in, and cheer group members.
11. **Achievements & badges (`/achievements`):** streak and milestone badges with 3D medal/trophy visuals.
12. **Goal planner (`/goals`) and Meal planner (`/meals`):** pick a personal goal, get a matching habit plan, then meal ideas with ingredients and estimated macros.
13. **Notifications:** OneSignal web push and habit reminders (`/api/notifications`), with a notification popup in the navbar.

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
The backend reads **`server/.env`** (copy `server/.env.example` to `server/.env`). It is loaded by the `npm run dev` / `npm start` scripts in `server/package.json`. A root `.env.local` is **not** used any more.
```env
# Neon Serverless PostgreSQL Connection String
DATABASE_URL="postgresql://<user>:<password>@<host>/neondb?sslmode=require"

# JWT Secret for Session Authentication
JWT_SECRET="<any long random string>"

# Optional: Google Gemini API Key for AI Goal Coach
GEMINI_API_KEY=""

PORT=3000
```
🔐 **Get the real values from the team group chat — never commit them.** `server/.env.example` also lists the optional Google Health and OneSignal keys.

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
`seedNeon.js` also adds them when it re-seeds. `rival_david` is left unconnected so searching and "Add friend" can be demoed.

### Testing
```bash
# Backend unit tests (Vitest, 99 tests)
cd server && npm test

# End-to-end tests (Playwright, desktop + mobile projects)
cd FitBuddy && npx playwright test
```
- Playwright starts the backend and frontend if they aren't already running (the frontend auto-start uses `pnpm dev`; if you don't have pnpm, start both servers yourself first). It uses the **shared Neon database**: tests only create data prefixed `E2E ` and clean it up afterwards. See `FitBuddy/e2e/README.md`.
- ⚠️ `scripts/verifyAllEndpoints.js` is **outdated** (it calls `/api/health-sync/simulate`, which no longer exists). Don't rely on it.

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
├── api/index.js               # Vercel serverless function entrypoint (repo root)
├── server/                    # Express 5 REST API Backend (Neon PostgreSQL only, no Mongo)
│   ├── config/                # neon.js (connection + auto-schema), onesignal.js, storage.js
│   ├── controllers/           # auth, neonHabit, neonLeaderboard, friend, challenge, group,
│   │                          # healthSync, analytics, achievements, notification, ai
│   ├── middleware/requireUser.js  # Bearer token JWT verification
│   ├── routes/                # Express routes (/api/auth, /api/habits, etc.)
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
│   │   │   ├── dashboard/     # AnalyticsDashboard, MonthlyHeatmap, ChallengesSection, FitnessTrackerWidget
│   │   │   ├── friends/       # FriendRow
│   │   │   ├── notifications/ # NotificationModal
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
│   ├── verifyAllEndpoints.js  # OUTDATED, don't use
│   ├── captureScreenshots.js  # Automated browser screenshot capture runner
│   └── generatePdf.js         # Playwright PDF generator
│
├── docs/                      # google-health-setup.md etc.
├── README.md                  # Setup, run, test, demo logins, library credits
├── FitBuddy_Project_Documentation.pdf # Comprehensive 14-page project documentation
├── TEAM_HANDOVER.md           # This document
└── vercel.json                # Vercel routing & build configuration
```

> ⚠️ **Note on Dual-Root Architecture:**  
> When deploying to Vercel, some developers set Root Directory to `./` while others set it to `FitBuddy`. Our setup has **dual-root compatibility**:
> - `scripts/build.js` automatically detects whether it's run from `./` or `FitBuddy` and compiles the assets accordingly.
> - Backend routes are accessible whether Vercel deploys from the root or subfolder.
> - When run from the root, `scripts/build.js` first copies `server/` over `FitBuddy/server/`, so edit `server/` only.

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
   - `id` (SERIAL PK), `sender_id` (VARCHAR FK), `recipient_id` (VARCHAR FK), `type` (VARCHAR: `cheer`, `nudge`, `fire`, `celebrate`), `message` (TEXT), `created_at`, `sent_on` (DATE, Singapore day).
   - Unique index on (`sender_id`, `recipient_id`, `type`, `sent_on`): each type can be sent to a person once per day.
5. **`challenges`**:
   - `id` (SERIAL PK), `creator_id` (VARCHAR FK), `opponent_id` (VARCHAR FK), `title` (VARCHAR), `habit_category` (VARCHAR), `target_days` (INT), `creator_progress` (INT), `opponent_progress` (INT), `status` (VARCHAR: `active`, `completed`).
6. **`friendships`**:
   - `id` (SERIAL PK), `requester_id` (VARCHAR), `addressee_id` (VARCHAR), `status` (VARCHAR: `pending`, `accepted`), `created_at`, `responded_at`.
   - One row per pair of people (unique index on the two ids in sorted order), whichever of them sent the request. Declining, cancelling and removing delete the row, so the same two people can start over.
7. **`habit_groups`** / **`habit_group_members`**: a group (`name`, `owner_id`) and its members (`group_id`, `user_id`).
8. **`group_activities`** / **`group_activity_members`**: an activity inside a group (`title`, `start_date`, `end_date`, `points`) and the members taking part.
9. **`group_checkins`**: one check-in per (`activity_id`, `user_id`, `checkin_date`) with the `points` earned.
10. **`group_activity_cheers`**: a cheer from one group member to another for an activity, once per sender, recipient and day.
11. **`google_health_connections`**: one row per user with the encrypted Google refresh token, granted scopes and `last_synced_at`.
12. **`google_health_oauth_states`**: short-lived one-time OAuth `state` hashes with an `expires_at`.

> Achievements are not stored in their own table; they are calculated from check-ins by `services/achievementsService.js`.

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
| `GET` | `/api/habits` | Yes (`Bearer`) | Fetches all active habits for the logged-in user |
| `POST` | `/api/habits` | Yes (`Bearer`) | Creates a new habit |
| `POST` | `/api/habits/:id/checkins` | Yes (`Bearer`) | Logs progress for a habit |
| `PUT` / `DELETE` | `/api/habits/:id/checkins/:date` | Yes (`Bearer`) | Sets or undoes the check-in for a specific date |
| `GET` | `/api/habits/:id/history` | Yes (`Bearer`) | A habit's check-in history |
| `GET` | `/api/leaderboard/weekly` | Yes (`Bearer`) | Dynamic weekly leaderboard rankings and points |
| `POST` | `/api/leaderboard/cheer` | Yes (`Bearer`) | Sends a cheer/nudge to a fellow athlete. **409** if that type was already sent to them today |
| `GET` | `/api/leaderboard/cheers` | Yes (`Bearer`) | Gets latest cheers received by current user |
| `GET` | `/api/friends` | Yes (`Bearer`) | Your `friends`, `incoming` requests and `outgoing` requests |
| `GET` | `/api/friends/search?q=` | Yes (`Bearer`) | Finds athletes by name or exact email (2+ characters, max 10, **400** if shorter). Each result has a `relation`: `none`, `friends`, `outgoing` or `incoming`; no emails returned |
| `POST` | `/api/friends/requests` | Yes (`Bearer`) | Body `{ userId }`. Sends a request (**201**); if they already asked you, accepts it instead (**200**). **400** for yourself, **404** unknown user, **409** already friends / already sent |
| `POST` | `/api/friends/requests/:id/accept` | Yes (`Bearer`) | Accepts a request addressed to you |
| `POST` | `/api/friends/requests/:id/reject` | Yes (`Bearer`) | Declines a request addressed to you (deletes it) |
| `DELETE` | `/api/friends/requests/:id` | Yes (`Bearer`) | Cancels a request you sent |
| `DELETE` | `/api/friends/:userId` | Yes (`Bearer`) | Removes a friend (**404** if you aren't friends) |
| `GET` | `/api/friends/:userId/profile?today=YYYY-MM-DD` | Yes (`Bearer`) | A friend's profile, weekly points and week analytics. **403** unless you are friends |
| `GET` / `POST` | `/api/groups` | Yes (`Bearer`) | Lists your groups / creates a group |
| `POST` | `/api/groups/:groupId/activities` | Yes (`Bearer`) | Adds a group activity |
| `POST` | `/api/groups/activities/:activityId/check-in` | Yes (`Bearer`) | Checks in to a group activity |
| `POST` | `/api/groups/activities/:activityId/cheer` | Yes (`Bearer`) | Cheers a group member |
| `GET` | `/api/achievements` | Yes (`Bearer`) | Achievements / badges and progress |
| `GET` | `/api/notifications/status` | Yes (`Bearer`) | Whether OneSignal push is configured |
| `POST` | `/api/notifications/remind-habits` | Yes (`Bearer`) | Sends habit reminders (also `/test` and `/broadcast`) |
| `GET` | `/api/health-sync/google/status` | Yes (`Bearer`) | Is Google Health configured / connected |
| `GET` | `/api/health-sync/google/connect` | Yes (`Bearer`) | Starts the Google OAuth connect flow |
| `POST` | `/api/health-sync/google/sync` | Yes (`Bearer`) | Reads Google Health data and updates the mapped habits |
| `GET` | `/api/health-sync/today` | Yes (`Bearer`) | Today's synced metrics |
| `DELETE` | `/api/health-sync/google/connection` | Yes (`Bearer`) | Disconnects Google Health |
| `GET` | `/api/analytics/summary?period=day\|week\|month&offset=0&today=YYYY-MM-DD` | Yes (`Bearer`) | Analytics Dashboard: completion rates, per-day breakdown, streaks, category counts |
| `GET` | `/api/analytics/weekly-summary` | Yes (`Bearer`) | 7-day completion rates & category counts |
| `GET` / `POST` | `/api/challenges` | Yes (`Bearer`) | Lists / creates head-to-head challenges (also `/:id/accept`, `/:id/decline`, `/:id/progress`, `DELETE /:id`) |
| `POST` | `/api/ai/suggest-habits` | Yes (`Bearer`) | Google Gemini 3.5 Flash habit recommendation (one-shot) |
| `POST` | `/api/ai/coach-chat` | Yes (`Bearer`) | Goal coach chatbot. Body `{ messages: [{ role: 'user'\|'model', text }] }` → `{ reply, suggestions }` |

---

## 🛠️ 7. Coding Guidelines for Team Members

1. **Vue (follow the WAD2 slides):**
   - `<script setup>` only, no Options API. Use `ref` (not `reactive`), `computed` for derived values, `onMounted` for loading data.
   - Components talk through props/emits and slots (no `defineExpose`).
   - Shared state goes in a Pinia setup store in `src/stores/` (`ref` = state, `computed` = getters, functions = actions). Page-local data stays as refs in the page.
   - Styling: Bootstrap 5 classes and Bootstrap Icons (`bi bi-*`). No heavy UI libraries.
2. **HTTP:** put calls in `src/services/*Service.js` as `axios.get/post/put/delete('/api/...', ..., authConfig())`. No `axios.create`, no interceptors.
3. **Routing:** add `meta: { requiresAuth: true }` to protected routes. The guard in `router/index.js` handles redirect-to-login and back.
4. **Beyond the syllabus:** if you truly need `watch`, `onUnmounted` cleanup, `Teleport`, `Transition`, template refs or `nextTick`, add a `// Beyond WAD2 syllabus:` comment above it explaining why in plain English.
5. **Third-party libraries:** credit every one at its import with `// Third-party library: <name> (<url>) — used for …` and list it in the root `README.md`.
6. **Backend:** edit `server/` only, then sync to `FitBuddy/server/` (run `node scripts/build.js` from the root, or copy the folder, excluding `node_modules` and `.env`). Use parameterized tagged templates only (`sql\`SELECT ... WHERE user_id = ${userId}\``) to prevent SQL injection. Put a short comment above each handler.
7. **Keep Commits Clean:** before pushing run
   - `cd FitBuddy && npx vite build`
   - `cd server && npm test`
   - the Playwright tests for the feature you touched (e.g. `cd FitBuddy && npx playwright test habits`)
   - Keep `data-testid`s, element ids and button text stable: the E2E tests rely on them.

---

## 💡 8. Potential Next Features / Ideas for Teammates

If teammates are looking for items to build next, here are great ideas:
- [ ] **Custom Profile Picture Upload:** Integrate with Neon S3 Object Storage (`assets` bucket) for user avatars.
- [ ] **Export to CSV / PDF:** Allow users to download a summary report of their monthly fitness logs.
- [ ] **In-app Toast Notifications:** Popups when a friend cheers or nudges you while on the app (web push already exists via OneSignal).

---
*Questions or issues? Reach out on our group chat or check the full generated documentation in `FitBuddy_Project_Documentation.pdf`.*

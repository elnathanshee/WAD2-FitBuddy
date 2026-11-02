# HabitBuddy API (Express + Neon PostgreSQL)

## Setup

1. Create a free Neon project (neon.tech) and copy its connection string.
2. Copy the environment file and set `DATABASE_URL` to that connection string:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the API (restarts on file changes). The tables are created automatically
   on startup by `config/neon.js`:
   ```bash
   npm run dev
   ```
   Check it's up: http://localhost:3000/api/health → `{"status":"ok"}`
5. In another terminal, start the frontend (`cd ../FitBuddy && pnpm dev`). Vite
   forwards `/api/*` calls to this server.

Optional demo data: `npm run seed:neon` (habits and check-ins) and
`npm run seed:friends` (demo friendships).

## Folder structure

```
server/
├── server.js              starts the app + sets up the Neon tables
├── app.js                 Express app: middleware + routes (importable by tests)
├── config/
│   ├── neon.js            Neon connection + table creation
│   ├── onesignal.js       OneSignal push setup
│   └── storage.js         file storage setup
├── middleware/
│   └── requireUser.js     PLACEHOLDER auth: reads x-user-id header → req.userId
├── routes/                URL → controller function (habits, leaderboard, ...)
├── controllers/           request handlers (neonHabitController.js,
│                          neonLeaderboardController.js, ...)
├── services/
│   ├── pointsService.js   scoring rules
│   ├── achievementsService.js
│   └── notificationService.js
├── utils/                 dates.js, streak.js, analytics.js, ...
├── tests/*.test.js        Vitest unit tests
├── seedNeon.js            demo data
└── seedFriends.js         demo friendships between the demo user and rivals
```

## API

Every `/api/habits` route needs the `x-user-id` header. `src/services/api.js` in the
frontend adds it for you.

| Method | URL | Body | Success |
|---|---|---|---|
| GET | `/api/habits?today` | | 200 list (each with `todayCount` and `streak`) |
| POST | `/api/habits` | habit fields | 201 habit |
| GET | `/api/habits/:id` | | 200 habit |
| PUT | `/api/habits/:id` | fields to change | 200 habit |
| DELETE | `/api/habits/:id` | | 204 |
| POST | `/api/habits/:id/checkins` | `{ date, count? }` (adds to the day's total) | 200/201 check-in |
| PUT | `/api/habits/:id/checkins/:date` | `{ count }` (replaces the total; 0 clears it) | 200 check-in / 204 |
| DELETE | `/api/habits/:id/checkins/:date` | | 204 |
| GET | `/api/habits/:id/history?from&to&today` | | 200 `{ habit, checkIns, streak }` |

Errors: 400 validation · 401 no user · 404 not found / not yours · 501 not implemented yet.

## Tests

```bash
npm test            # Vitest unit tests in tests/*.test.js (describe / it / expect)
```

The habits API behaviour is covered by the Playwright end-to-end tests in
`../FitBuddy/e2e/`.

End-to-end tests live in `../FitBuddy/e2e` (see the README there).

## AI usage disclosure (IS216 FAQ #20)

Generated with AI (Claude), as boilerplate/test/mock-data assistance:
- Project scaffolding: `package.json`, `app.js`, `server.js`, `config/db.js` (since removed),
  `middleware/requireUser.js` (placeholder), `utils/dates.js`, Mongoose model field
  definitions (since removed), route table, and the controller/streak **stubs and their spec comments**
- Mock data: `seed.js` (since removed)
- Test cases: `tests/streak.test.js`, `../FitBuddy/e2e/*`, `../FitBuddy/playwright.config.js`
- Frontend config: Vite `/api` proxy, `src/services/api.js` axios instance
- Analytics Dashboard (David, with Claude): `utils/analytics.js`, `tests/analytics.test.js`,
  `controllers/analyticsController.js`, `routes/analytics.js`, and in the frontend
  `components/dashboard/AnalyticsDashboard.vue`, `MonthlyHeatmap.vue`,
  `utils/completionLevels.js`, `services/analyticsService.js`
- UI redesign & page restructure (David, implemented by Claude): the design system
  (`src/assets/main.css`), animations, `App.vue` route transition, `Navbar.vue`
  (sliding pill, mobile tab bar, account menu), the new Home page
  (`views/HomePage.vue`), the stats-only `views/Dashboard.vue`, and the restyle of
  `Leaderboard.vue`, `HabitsPage.vue`, `HabitCard.vue`, `AppModal.vue`,
  `ChallengesSection.vue`, `FitnessTrackerWidget.vue` (Google Health card),
  `AnalyticsDashboard.vue`, `MonthlyHeatmap.vue` and the login/sign-up pages
- Visual refresh (implemented by Claude): warm palette, bottom navigation on every
  screen size, divider-based layouts, 3-colour month calendar, reordered Dashboard,
  4-point spacing scale and type ramp (`src/assets/main.css`)
- Interactive layer (implemented by Claude): background presets
  (`composables/useBackground.js`), highlights carousel (`components/HighlightsCarousel.vue`),
  count-up numbers (`components/CountUp.vue`), scroll-reveal and tilt
  (`directives/motion.js`), 3D streak medal and trophy (`components/three/*`,
  `utils/three/spinnable.js`), page titles/meta, OG image and favicon
- Third-party, free resources used (credited per IS216 FAQ #6):
  - Three.js (MIT licence, threejs.org): 3D rendering; models are built in code
  - Fredoka and Nunito fonts (SIL Open Font Licence, via Google Fonts)
  - Palette and font pairing from the open-source ui-ux-pro-max design database
    (github.com/nextlevelbuilder/ui-ux-pro-max-skill, "Habit Tracker" and
    "Playful Creative" profiles)
- AI Goal Coach chatbot (implemented by Claude): `components/habits/CoachChat.vue`,
  `services/aiService.js` `coachChat()`, and the backend `POST /api/ai/coach-chat`
  (`coachChat`, `callGemini`, `sanitizeSuggestion` in `controllers/aiController.js`)
- Once-a-day cheer/nudge limit (implemented by Claude): `sent_on` column + unique
  index in `config/neon.js`, the 409 rule and `sentToday` in
  `controllers/neonLeaderboardController.js`
- Tests (Claude): `../FitBuddy/e2e/navigation.spec.js`, `coach-chat.spec.js`,
  `leaderboard.spec.js`, and the coach-chat cases in `tests/ai.api.test.js`
- Syllabus refactor (Nov 2026, implemented by Claude, reviewed by Kaven): removed the unused MongoDB code path, converted the backend unit tests to Vitest, and refactored the frontend to the WAD2 syllabus (Pinia stores, plain Axios calls, Week 11 route guard, smaller components).

Written by the team: all controller handler logic, `calculateStreak`, and the Vue
habit pages/components. *(Update this list as the code changes.)*

---

## Gamification: points & the weekly leaderboard

Owned by Angus (feature 6, Reminders & Gamification). Built on top of the habit
and check-in code rather than beside it — it reads the same tables and uses
the same `requireUser` / `x-user-id` convention, and adds no fields to `Habit`
or `CheckIn`.

### Scoring

| Rule | Points |
| --- | --- |
| A habit's target met for a day (or for a week, if the habit is weekly) | +10 |
| Every **daily** habit completed on the same day | +20 |
| A run of completions reaching 7, 14, 21 … | +30 each |

### How the score is worked out

Points are **derived from check-ins**, not banked in a separate table. Asking
the check-ins every time means a score can never drift out of step with the
habits it came from, and nothing in the habit code has to remember to award
anything. The weekly "reset" is simply which week is scored — no history is
deleted, so last week's board stays computable.

`services/pointsService.js` holds the rules. The check-in rows are read from the
Neon `check_ins` table (joined to `habits` for each target and frequency) by
`controllers/neonLeaderboardController.js`. The rules themselves (milestones, the
all-habits bonus) are pure functions over those rows, which is why they can be
unit tested with no database.

`controllers/neonLeaderboardController.js` scores every user for the week and ranks them.
It starts from the list of people rather than the list of scores, so someone on
zero points this week still appears — they are exactly who a leaderboard is
meant to nudge. Ties share a rank (two users on 90 are both 1st, the next is 3rd).

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/leaderboard/weekly?today=YYYY-MM-DD` | Ranked board for that week |
| GET | `/api/leaderboard/me?today=YYYY-MM-DD` | Your own score, broken down |
| PUT | `/api/leaderboard/profile` | Set the name/colour shown on the board |

`today` comes from the browser so the week is the user's local week — the same
convention the habit endpoints use.

### Demo data

Everyone signs in as user `1` with the mock login, so the board would otherwise
have a single row. `seedFriends.js` adds demo friendships (safe to run again):

```bash
npm run seed:neon     # demo habits and check-ins
npm run seed:friends  # add the demo friendships
```

### Tests

```bash
npx vitest run tests/points.test.js
```

The tests cover the scoring rules, weekly vs daily targets, streak milestones
and week boundaries. No database required.

### Table used

The Neon `users` table (see `config/neon.js`) holds the profile (display name +
colour) keyed by the same `userId` the habit code uses, so the board can show
names instead of raw ids.

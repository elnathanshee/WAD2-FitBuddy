# HabitBuddy API (Express + MongoDB)

## Setup

1. Create a free MongoDB Atlas cluster. Add a database user, and allow your IP under
   *Network Access*.
2. Copy the environment file and paste in your connection string:
   ```bash
   cp .env.example .env
   ```
3. Install and seed demo data:
   ```bash
   npm install
   npm run seed
   ```
4. Start the API (restarts on file changes):
   ```bash
   npm run dev
   ```
   Check it's up: http://localhost:3000/api/health → `{"status":"ok"}`
5. In another terminal, start the frontend (`cd ../FitBuddy && pnpm dev`). Vite
   forwards `/api/*` calls to this server.

Log in with any email and password `password123`. The mock login is user `"1"`,
which owns the seeded habits.

## Folder structure

```
server/
├── server.js              starts the app + connects to MongoDB
├── app.js                 Express app: middleware + routes (importable by tests)
├── config/db.js           MongoDB connection
├── middleware/
│   └── requireUser.js     PLACEHOLDER auth: reads x-user-id header → req.userId
├── models/
│   ├── Habit.js           habit fields + validation
│   └── CheckIn.js         one document per habit per day
├── routes/habits.js       URL → controller function
├── controllers/
│   └── habitController.js TODO: the handlers (each has its spec in a comment)
├── utils/
│   ├── dates.js           'YYYY-MM-DD' helpers
│   └── streak.js          TODO: calculateStreak()
├── tests/streak.test.js   unit tests for calculateStreak
└── seed.js                demo data
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
npm test            # unit tests (calculateStreak) — fail until streak.js is implemented
```

End-to-end tests live in `../FitBuddy/e2e` (see the README there).

## AI usage disclosure (IS216 FAQ #20)

Generated with AI (Claude), as boilerplate/test/mock-data assistance:
- Project scaffolding: `package.json`, `app.js`, `server.js`, `config/db.js`,
  `middleware/requireUser.js` (placeholder), `utils/dates.js`, Mongoose model field
  definitions, route table, and the controller/streak **stubs and their spec comments**
- Mock data: `seed.js`
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

Written by the team: all controller handler logic, `calculateStreak`, and the Vue
habit pages/components. *(Update this list as the code changes.)*

---

## Gamification: points & the weekly leaderboard

Owned by Angus (feature 6, Reminders & Gamification). Built on top of the habit
and check-in code rather than beside it — it reads the same collections and uses
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

`services/pointsService.js` holds the rules. `loadProgressRows()` does the heavy
lifting in MongoDB with one aggregation: `$group` collapses repeat logs into a
single total per user/habit/day, `$lookup` joins each total to its habit so the
target and frequency are known, and `$project` flattens the result. The rules
themselves (milestones, the all-habits bonus) are pure functions over those rows,
which is why they can be unit tested with no database.

`services/leaderboardService.js` scores every user for the week and ranks them.
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
have a single row. `seedLeaderboard.js` adds four rival users with their own
habits and history:

```bash
npm run dev:memory        # in-memory database, rivals included automatically
npm run seed:leaderboard  # add the rivals to a real database (Atlas)
```

`seed:leaderboard` is scoped to users 2–5 and the display-name profiles only.
It never deletes the demo user's habits or anyone else's data, so it is safe to
run against the shared cluster.

### Tests

```bash
node --test tests/points.test.js
```

12 tests covering the scoring rules, weekly vs daily targets, streak milestones
and week boundaries. No database required.

### Model added

`models/User.js` is a minimal profile (display name + colour) keyed by the same
string `userId` the habit code already uses, so the board can show names instead
of raw ids. It is replaced by the real user model when authentication lands.

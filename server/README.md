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

Written by the team: all controller handler logic, `calculateStreak`, and the Vue
habit pages/components. *(Update this list as the code changes.)*

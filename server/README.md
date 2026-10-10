# FitBuddy API — Gamification service

Backend for the **Reminders & Gamification** feature area (Angus): points, streaks
and the weekly leaderboard.

## What this does

| Rule | Points |
| --- | --- |
| Check in any habit | +10 |
| Complete *every* active habit in a day | +20 bonus |
| A habit's streak reaches a multiple of 7 | +30 bonus |

Every award is written as its own row in an **append-only points ledger**
(`PointTransaction`), stamped with the Monday of the week it was earned in. The
weekly leaderboard is then just a filter on that week — which is how the board
"resets" every Monday **without ever deleting anything**. Last week's rows stay
in the database, so all-time totals remain computable later.

## Setup

```bash
cd server
cp .env.example .env        # then paste your MongoDB Atlas connection string in
npm install
npm run seed                # creates 6 demo users with two weeks of history
npm run dev                 # http://localhost:4000
```

Then in a second terminal:

```bash
cd FitBuddy
pnpm install
pnpm dev                    # http://localhost:5173 -> open /leaderboard
```

### MongoDB Atlas

1. Create a free **M0** cluster at <https://www.mongodb.com/cloud/atlas> (Singapore
   region, `ap-southeast-1`).
2. **Database Access** -> add a user with a password.
3. **Network Access** -> allow `0.0.0.0/0` (Vercel has no fixed IP).
4. **Connect -> Drivers** -> copy the connection string into `MONGODB_URI` in `.env`.

`.env` is gitignored. Never commit it.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness check |
| GET | `/api/users` | Demo user list (temporary, until login exists) |
| GET | `/api/habits` | Current user's habits with streaks + today's status |
| POST | `/api/checkins` | Check in a habit; awards points; returns what was earned |
| GET | `/api/leaderboard/weekly` | This week's ranked leaderboard |

All responses use the envelope `{ success: true, data }` or
`{ success: false, message }`.

Status codes: `200` read, `201` created, `400` validation, `401` no user,
`403` not your habit, `404` not found, `409` duplicate check-in, `500` server error.

### Temporary authentication

Login is Elnathan's scope and isn't merged yet, so the current user is read from
an `x-user-id` header in `routes/index.js`. When real auth lands, that one
middleware changes to read the verified JWT instead — every controller keeps
working unchanged.

## Tests

```bash
npm run test:logic
```

14 tests covering the scoring rules, streak calculation and week boundaries.
These are pure-function tests, so they need no database and no network.

## Notable implementation detail

`services/leaderboardService.js` builds the board in a **single MongoDB
aggregation pipeline**. It starts from `User` rather than from the ledger, so
players who haven't scored this week still appear (starting from the ledger
would make them vanish — exactly the people a leaderboard should motivate), and
it uses `$setWindowFields` with `$rank` so positions and tie handling are
computed in the database rather than counted up in JavaScript afterwards.

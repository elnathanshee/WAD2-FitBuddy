# FitBuddy

FitBuddy is a social habit and fitness tracker built for SMU IS216 (WAD2). Users create daily habits, log progress, build streaks and earn points and badges. They can compete with friends on a weekly leaderboard, send cheers and nudges, join groups and challenges, plan goals and meals, chat with an AI goal coach and see Google Health activity.

- **GitHub:** https://github.com/elnathanshee/WAD2-FitBuddy
- **Deployed app:** https://wad-2-fit-buddy.vercel.app

## Tech stack

Vue 3 (`<script setup>`, Composition API), Vue Router, Pinia, Axios, Bootstrap 5, Express 5, Neon Postgres, Vitest (backend unit tests), Playwright (end-to-end tests).

## Prerequisites

- Node.js 20 or newer (with npm)
- A Neon Postgres connection string (`DATABASE_URL`). The team will provide a ready `server/.env` to graders separately. To use your own database, create a free project at https://neon.tech.

## Setup

```bash
# 1. Install dependencies (from the repo root)
cd server && npm install && cd ..
cd FitBuddy && npm install && cd ..
# Optional: root dependencies are only needed for the Vercel build and scripts/
npm install

# 2. Create the backend environment file, then edit it
cp server/.env.example server/.env
```

Environment variables in `server/.env` (see `server/.env.example`):

| Variable | Needed? | Used for |
|---|---|---|
| `DATABASE_URL` | **Required** | Neon Postgres connection string |
| `PORT` | Optional | API port (default 3000) |
| `GEMINI_API_KEY` | Optional | AI goal coach (https://aistudio.google.com). Without it the coach is unavailable |
| `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, `GOOGLE_HEALTH_REDIRECT_URI`, `APP_URL`, `HEALTH_TOKEN_ENCRYPTION_KEY` | Optional | Connecting a real Google Health account (see `docs/google-health-setup.md`). Without them the card shows its "Connect" state |
| `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` | Optional | Web push notifications and reminders |

To create the demo data in an empty database run `cd server && npm run seed:neon` (and `npm run seed:friends` for friend links).

## Run the app

Use two terminals:

```bash
# Terminal 1: backend on http://localhost:3000
cd server && npm run dev

# Terminal 2: frontend on http://localhost:5173 (Vite proxies /api to port 3000)
cd FitBuddy && npm run dev
```

Open http://localhost:5173. Backend health check: http://localhost:3000/api/health.

## Demo login

All accounts use the password `password123`:

| Email | Name |
|---|---|
| `demo@fitbuddy.com` | You (main demo user) |
| `alex@fitbuddy.com` | Alex Tan |
| `bernice@fitbuddy.com` | Bernice Lim |
| `charlie@fitbuddy.com` | Charlie Wong |
| `david@fitbuddy.com` | David Lee |

## Tests

**Backend unit tests (Vitest, no database needed):**

```bash
cd server && npm test
```

Covers points, streaks, achievements, analytics, challenges, friends, OneSignal helpers and the AI endpoint.

**End-to-end tests (Playwright).** Start the backend and frontend first (see above), then:

```bash
cd FitBuddy
npx playwright install chromium        # first time only
npx playwright test                    # desktop and mobile (375x667)
npx playwright test --project=desktop  # or --project=mobile
npm run test:e2e:ui                    # interactive UI mode
```

| Spec file | Covers |
|---|---|
| `e2e/habits.spec.js` | Habit create/edit/delete, daily check-ins, history and streaks |
| `e2e/navigation.spec.js` | Login, Home page, tabs reach every page, Google Health card, logout |
| `e2e/friends.spec.js` | Search, send/accept/decline friend requests, friend profile, server friend rules |
| `e2e/leaderboard.spec.js` | Weekly leaderboard, cheers and nudges (once per day each) |
| `e2e/challenges.spec.js` | Challenging friends, pending/declined invites, server rules |
| `e2e/coach-chat.spec.js` | AI coach chat (API mocked): suggestions and adding habits |
| `e2e/experience.spec.js` | Highlights carousel, background picker, 3D models, page titles |

The E2E tests run against the shared Neon database. Data they create is prefixed `E2E ` and cleaned up afterwards. The "cheer and nudge are limited separately" test skips itself if every athlete was already nudged today.

## Folder structure

```
FitBuddy/                  Vue 3 frontend (Vite)
  src/views/               Page-level screens (Dashboard, Leaderboard, Friends, Groups, planners...)
  src/components/          Reusable components grouped by feature (habits, navbar, dashboard, three...)
  src/stores/              Pinia stores (auth, theme, friend requests, coach chat, health sync)
  src/services/            Axios calls to the API, one file per feature
  src/router/              Routes and the login guard
  e2e/                     Playwright tests
  api/, server/            Copy of the backend, for deploying from the FitBuddy folder
server/                    Express backend
  routes/, controllers/    URL routes and their handlers
  services/, utils/        Business logic (points, streaks, achievements...) and helpers
  middleware/, config/     Auth, database and storage setup
  tests/                   Vitest unit tests
api/index.js               Vercel serverless entry (wraps the Express app)
scripts/                   Build and tooling scripts
docs/                      Extra documentation (Google Health setup)
```

`FitBuddy/server/` is a mirror of `server/`; edit `server/` and copy changes across.

## Third-party libraries and credits

- [Vue 3](https://vuejs.org), [Vue Router](https://router.vuejs.org), [Pinia](https://pinia.vuejs.org): framework, routing, shared state
- [Vite](https://vite.dev): dev server and build
- [Bootstrap 5](https://getbootstrap.com) and [Bootstrap Icons](https://icons.getbootstrap.com): layout, components, icons
- [Axios](https://axios-http.com): HTTP calls to the API
- [Chart.js](https://www.chartjs.org) and [vue-chartjs](https://vue-chartjs.org): dashboard charts
- [three.js](https://threejs.org): 3D streak medal and trophy
- [canvas-confetti](https://github.com/catdad/canvas-confetti): celebration effect
- [emoji-picker-element](https://github.com/nolanlawson/emoji-picker-element): emoji picker for habit icons
- [Express](https://expressjs.com) and [cors](https://github.com/expressjs/cors): backend server
- [Neon serverless driver](https://github.com/neondatabase/serverless): Postgres access
- [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs): Google OAuth for Google Health
- [AWS SDK S3 client](https://github.com/aws/aws-sdk-js-v3): image storage
- [Vitest](https://vitest.dev), [Supertest](https://github.com/forwardemail/supertest), [Playwright](https://playwright.dev): testing
- Fonts: [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito](https://fonts.google.com/specimen/Nunito) (Google Fonts)

## External APIs (asynchronous HTTP)

- **Google Gemini API**: AI goal coach (`server/controllers/aiController.js`, called with `fetch`)
- **Google Health API** (Google OAuth): steps, active minutes, distance and calories (`server/controllers/healthSyncController.js`)
- **OneSignal REST API**: web push notifications and reminders (`server/services/notificationService.js`, `FitBuddy/src/services/notificationService.js`)

## AI usage disclosure

The AI-assisted parts of this project are listed per IS216 FAQ #20 in [server/README.md](server/README.md#ai-usage-disclosure-is216-faq-20).

## Syllabus notes

The code follows the WAD2 syllabus: Composition API with `<script setup>`, Pinia setup stores, Axios requests with an auth header helper, and a Vue Router guard. A few features need Vue or browser APIs beyond the syllabus (for example template refs, `Teleport`, timers cleaned up in `onUnmounted`, and the three.js canvases). Each is marked in the code with a `// Beyond WAD2 syllabus:` comment explaining why it is needed.

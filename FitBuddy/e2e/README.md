# End-to-end tests (Playwright)

| Spec | Covers |
|---|---|
| `habits.spec.js` | Habit CRUD, daily check-ins, completion history, streaks, access control |
| `navigation.spec.js` | Login lands on Home; Home sections; bottom navigation on every page; Dashboard is stats-only, in order, with a 3-colour calendar; logout in the account menu |
| `coach-chat.spec.js` | AI coach button position, chat send/reply, multi-turn history, adding a suggested habit, error + retry (Gemini is mocked with `page.route`) |
| `leaderboard.spec.js` | Cheer/nudge buttons, once-per-day lock (UI + reload), server 409 on a repeat, cheer and nudge limited separately |
| `friends.spec.js` | User search, sending / cancelling a request, accepting + removing a friend, declining, a friend's profile (stats, week strip, habits), server rules (403 / 400 / 409, no emails), friend links on the leaderboard. Only `rival_david` is changed; his friendship is reset before and after each test |
| `experience.spec.js` | Highlights carousel (buttons, dots, autoplay, pause on hover, no autoplay with reduced motion, slide links), background picker (persists after reload), 3D medal/trophy load or fall back, page titles |

Each test runs twice: on a desktop viewport and on a 375 × 667 phone (iPhone 6/7/8).
Tests log in as the seeded demo account `demo@fitbuddy.com` / `password123`.

## Running

One-time setup:

```bash
pnpm install
npx playwright install chromium
```

Then, with the API running against the Neon database (see `TEAM_HANDOVER.md`):

```bash
pnpm test:e2e        # headless, prints results
pnpm test:e2e:ui     # interactive UI mode, good for debugging
npx playwright show-report   # open the HTML report from the last run
```

Playwright starts the API (`../server`) and Vite automatically if they aren't
already running.

**Repeatable:** every habit a test creates is named `E2E …` and deleted after the
test, so the seeded demo data is never touched and tests can run in any order.

## Selector contract (`data-testid`)

The tests find elements by `data-testid`, not by CSS classes or text, so
restyling the page won't break them. The Habits page (`/habits`) must use these:

| data-testid | Element | Notes |
|---|---|---|
| `add-habit-btn` | Button that opens the create form | |
| `habit-form` | The create/edit form (e.g. inside a Bootstrap modal) | Same form for create and edit; pre-filled when editing |
| `habit-name-input` | Name `<input>` | |
| `habit-emoji-btn` | Button that opens the emoji picker | Contains `habit-emoji-value` (the chosen emoji) |
| `habit-category-select` | Category `<select>` | option values: `exercise` `water` `sleep` `study` `other` |
| `habit-custom-category-input` | Text `<input>` | Shown when category is `other` |
| `habit-frequency-select` | Frequency `<select>` | option values: `daily` `weekly` |
| `habit-target-label` | Target heading | "Daily target" or "Weekly target", following the frequency |
| `habit-target-amount-input` | Number `<input>` | Per day (daily) or per Monday–Sunday week (weekly). Decimals allowed |
| `habit-target-unit-select` | Unit `<select>` | Common units, plus "Other…" |
| `habit-custom-unit-input` | Text `<input>` | Shown when the unit is "Other" |
| `habit-save-btn` | Submit button | |
| `habit-form-error` | Error message | Shown when saving fails validation (e.g. empty name). Use your own validation or show the server's 400 message — HTML `required` alone shows no element. |
| `habit-card` | One per habit in the list | Must contain the habit name as text |
| `habit-frequency` | Inside card | "Daily" or "Weekly" |
| `habit-status` | Inside card | "Not started" / "In progress" / "Completed"; the card also has `data-status` |
| `habit-progress` | Inside card | Progress for today (daily) or this week (weekly), text like `1 / 3` |
| `habit-streak` | Inside card | **Only the number**, e.g. `3` (put "day streak" in a separate element) |
| `log-btn` | Inside card | Opens the log popup (`log-modal`) |
| `log-modal` | Log popup | |
| `log-chip` | Quick amount buttons in the popup | Fill in `log-amount-input` |
| `log-amount-input` | Number `<input>` | Amount to ADD to today's total |
| `log-submit-btn` | Popup button | |
| `edit-total-link` | Popup button | Switches to setting today's total |
| `edit-total-input` / `edit-total-save-btn` | Popup | REPLACES today's total; 0 clears it |
| `celebration-banner` | Page | Shown when the last habit of the day is completed |
| `habit-edit-btn` | Inside card | Opens `habit-form` pre-filled |
| `habit-delete-btn` | Inside card | Opens a confirmation |
| `confirm-delete-btn` | Confirmation dialog button | |
| `habit-history-btn` | Inside card | Opens the history panel |
| `habit-history` | History panel / modal | |
| `history-day` | One cell per day in the panel | Needs `data-date="YYYY-MM-DD"` and `data-completed="true"` or `"false"` |
| `history-week` | Weekly habits: week total cell | Needs `data-week="YYYY-MM-DD"` (the Monday) and `data-completed` |
| `history-current-streak` | Inside history panel | Only the number |
| `history-longest-streak` | Inside history panel | Only the number |

Other pages:

| data-testid | Element | Notes |
|---|---|---|
| `navbar` / `tabbar` | Top bar / bottom navigation | |
| `tab-<page>` | Bottom navigation links (every screen size) | `<page>` is `home`, `habits`, `dashboard`, `leaderboard`, `friends` |
| `account-menu-btn` / `logout-btn` | Account dropdown and its Log out item | |
| `home-hero`, `home-habits`, `home-challenges`, `google-health` | Home page sections | |
| `health-sync-btn` / `health-updates` / `health-steps` (also `-active`, `-distance`, `-calories`) | Google Health card | |
| `ai-coach-btn` | Floating coach button (Habits page) | |
| `coach-panel`, `coach-input`, `coach-send`, `coach-chip`, `coach-close` | Coach chat panel | |
| `coach-message` | One chat bubble | `data-role` is `user`, `model` or `error` |
| `coach-suggestion`, `coach-add-btn`, `coach-add-all` | Suggested habit cards | |
| `leaderboard-row` | One athlete | `data-user-id` is the athlete's id |
| `cheer-btn` / `nudge-btn` | Inside a row | Disabled once sent today |
| `leaderboard-toast` | Confirmation toast | |
| `leaderboard-friend-link` | Inside a row | Link on a friend's name to their profile |
| `add-friend-btn` | Inside a row | Add friend / Accept / Requested; `aria-label` has the text |
| `friends-search-input` / `friends-search-btn` / `friends-search-error` / `friends-search-empty` | Friends page search | |
| `friends-results` / `requests-incoming` / `requests-outgoing` / `friends-list` | Lists on the Friends page | |
| `friend-row` | One person in a list | `data-user-id` is their id |
| `friend-add-btn` / `friend-requested-btn` / `friend-cancel-btn` / `friend-accept-btn` / `friend-decline-btn` | Row buttons | |
| `friend-remove-btn` / `remove-friend-modal` / `confirm-remove-friend-btn` | Remove a friend and its confirmation | |
| `friends-toast` / `friends-summary` | Friends page toast / header counts | |
| `friend-hero` / `friend-meta` / `friend-stat` / `friend-week-strip` / `friend-week-dot` / `friend-habit` | Friend profile (`/friends/:id`) | 4 stat tiles, 7 dots, one `friend-habit` per habit |
| `friend-notice` / `friend-profile-remove-btn` | Not-friends message / Remove friend button on the profile | |
| `highlights-carousel` | Home carousel | `data-active-index` is the current slide |
| `carousel-slide`, `carousel-prev`, `carousel-next`, `carousel-dot` | Carousel parts | Dots have `aria-selected` |
| `bg-picker`, `bg-<id>` | Background picker in the account menu | ids: `paper`, `dots`, `topo`, `track`, `field`; the choice is `<html data-bg>` |
| `streak-medal`, `trophy-3d` | 3D models | `data-state` is `loading`, `ready` or `fallback` |

Example:

```html
<div class="card" data-testid="habit-card">
  <h5>{{ habit.name }}</h5>
  <span data-testid="habit-streak">{{ habit.streak.current }}</span> day streak
</div>
```

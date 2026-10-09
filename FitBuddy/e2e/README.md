# End-to-end tests (Playwright)

`habits.spec.js` covers the Habit feature's main user journeys: create, read,
update, delete, daily check-ins, completion history, streaks and access control.
Each test runs twice: on a desktop viewport and on a 375 × 667 phone (iPhone 6/7/8).

## Running

One-time setup:

```bash
pnpm install
npx playwright install chromium
```

Then, with `server/.env` pointing at your MongoDB:

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
| `habit-category-select` | Category `<select>` | option values: `exercise` `water` `sleep` `study` `other` |
| `habit-frequency-select` | Frequency `<select>` | option values: `daily` `weekly` |
| `habit-times-per-week-input` | Number `<input>` | Only needed when frequency is weekly |
| `habit-target-amount-input` | Number `<input>` | |
| `habit-target-unit-input` | Text `<input>` | e.g. "glasses" |
| `habit-save-btn` | Submit button | |
| `habit-form-error` | Error message | Shown when saving fails validation (e.g. empty name). Use your own validation or show the server's 400 message — HTML `required` alone shows no element. |
| `habit-card` | One per habit in the list | Must contain the habit name as text |
| `habit-frequency` | Inside card | Text like "Daily" or "3x per week" |
| `habit-progress` | Inside card | Today's progress, text like `1 / 3` |
| `habit-streak` | Inside card | **Only the number**, e.g. `3` (put "day streak" in a separate element) |
| `checkin-btn` | Inside card | Adds 1 to today's count |
| `undo-checkin-btn` | Inside card | Removes today's check-in |
| `habit-edit-btn` | Inside card | Opens `habit-form` pre-filled |
| `habit-delete-btn` | Inside card | Opens a confirmation |
| `confirm-delete-btn` | Confirmation dialog button | |
| `habit-history-btn` | Inside card | Opens the history panel |
| `habit-history` | History panel / modal | |
| `history-day` | One cell per day in the panel | Needs `data-date="YYYY-MM-DD"` and `data-completed="true"` or `"false"` |
| `history-current-streak` | Inside history panel | Only the number |
| `history-longest-streak` | Inside history panel | Only the number |

Example:

```html
<div class="card" data-testid="habit-card">
  <h5>{{ habit.name }}</h5>
  <span data-testid="habit-streak">{{ habit.streak.current }}</span> day streak
</div>
```

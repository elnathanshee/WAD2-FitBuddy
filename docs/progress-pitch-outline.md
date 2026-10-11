# Progress Pitch — 15-minute outline

Each slide lists the rubric line it scores against and the questions **your team**
answers on it. The rubric's A+ wording is "*Challenging* problems / features / job
scopes / web design / tech stacks are clearly defined. A *challenging* task is
functioning well." So every slide should be specific, and the demo should show
more than basic CRUD.

| # | Slide | Time | Rubric line |
|---|---|---|---|
| 1 | Title: HabitBuddy, Team 5, G8, all 6 names | 0:20 | — |
| 2 | The problem | 1:15 | Problems & features |
| 3 | Our solution + feature map | 1:15 | Problems & features |
| 4 | User journey / key screens (mobile-first) | 1:30 | Web design |
| 5 | Tech stack + architecture diagram | 1:45 | Tech stack |
| 6 | Data model | 1:00 | Tech stack |
| 7 | Job scopes & progress tracker | 1:30 | Task delegation |
| 8 | **Live demo: Habit CRUD + check-ins + streaks** | 4:00 | Functioning task |
| 9 | What makes it non-trivial | 1:00 | Functioning task (*challenging*) |
| 10 | Testing approach | 0:45 | (sets up the final's 10% testing score) |
| 11 | Next steps to Week 12 | 0:40 | Task delegation |
| — | Buffer / Q&A | 1:00 | |

Total ≈ 15:00. Rehearse with a timer. If Q&A isn't part of the 15 minutes,
give the buffer to the demo.

---

## Slide notes (questions to answer, not answers)

**2. Problem.** Who exactly (SMU students?) and what goes wrong (motivation fades,
no accountability)? Back it with one number: a quick survey of ~20 classmates beats
any generic statistic. Why don't existing apps solve it?

**3. Solution + features.** The 6 features from the proposal. Mark each as
*core MVP* vs *stretch*. Say which one is being demoed today.

**4. Web design.** 3–4 phone-sized wireframes or screenshots: login → habit list →
add/edit form → history. Name the UI patterns you used (cards, modals, bottom-thumb
buttons, empty states, confirmation before delete) and why. The graders test from
iPhone 6 (375px) to Bootstrap XL, so say how you handle both.

**5. Tech stack.** Vue 3 + Vite, Bootstrap 5 + Bootstrap Icons, axios, Express 5,
MongoDB Atlas + Mongoose, Vercel, Playwright. Draw the request flow:
`Vue component → axios → Vite proxy → Express route → controller → Mongoose → Atlas`.
External APIs: Google Health, OneSignal and Gemini. **Decide what Gemini is for
before the pitch** (e.g. a habit-suggestion coach?), or drop it. State clearly that
Neon was dropped and everything lives in MongoDB, and why.

**6. Data model.** Habit and CheckIn (and User, from Elnathan). Explain why check-ins
are a separate collection and why dates are stored as `YYYY-MM-DD` strings. The
reasons are in `server/models/CheckIn.js`, but say them in your own words.

**7. Job scopes.** The 6-row table from the proposal, plus status from the
"Project Progress Tracking" template format (Done by / Vet by / COMPLETE, INCOMPLETE,
NOT STARTED / est. % complete). Showing who *vets* whose work signals strong project
management.

**8. Demo script** (run `npm run seed` right before so the data looks lived-in):
1. Log in → habits list (seeded habits show existing streaks)
2. Create "Read 10 pages" (study, daily, 10 pages): it appears instantly
3. Try saving with an empty name: error message (server-side validation)
4. Edit it, change the target, refresh: change persisted
5. Check in on "Drink water" a few times: progress 5/8 → 8/8, streak updates
6. Open "Morning run" history: 30-day grid, current 6 vs longest 12
7. Delete the new habit with confirmation
8. *(Optional)* Resize to 375px in Chrome DevTools to show the same flow on mobile

Keep a **screen recording of the demo as a fallback** in case Wi-Fi or Atlas fails.

**9. Why it's challenging.** Pick what you actually built: per-user ownership checks
(404 for other users' habits); server-side validation; partial progress toward a
target; streak rules (grace day, longest vs current, month/year boundaries);
timezone-safe dates; cascade delete of history; automated tests.

**10. Testing.** 13 unit tests for streak edge cases + Playwright E2E for every
CRUD/check-in journey on desktop *and* 375px, using `data-testid` selectors.
Show the passing output for 5 seconds.

**11. Next steps.** Real auth replaces the `x-user-id` placeholder → friends +
leaderboard → dashboard charts built on the check-in history → reminders → Vercel
deploy. Put a week number on each.

---

## Housekeeping before the pitch
- [ ] Rename FitBuddy → HabitBuddy in the UI (Navbar, Login/Signup pages, page title)
- [ ] Update the proposal: drop Neon, state Gemini's purpose, add the Week 8/9 tracking notes
- [ ] Every member can explain the part they own (FAQ #20 + Q&A)
- [ ] Keep the AI disclosure in `server/README.md` accurate

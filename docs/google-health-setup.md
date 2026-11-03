# Google Health (Simulated Wearable Activity Data)

FitBuddy's Home page includes a **Google Health** card (`FitnessTrackerWidget.vue`) that runs in **simulated wearable activity mode** out-of-the-box, so every user and grader can test wearable telemetry and automatic habit check-in syncing without needing Google Cloud OAuth credentials or a mobile wearable device.

## How it works

1. **Baseline & Live Metrics:**
   - Displays four wearable metrics with colour-coded progress bars:
     - **Steps** (goal: `10,000` steps)
     - **Active minutes** (goal: `30` min)
     - **Distance** (`km`)
     - **Calories** (`kcal`)
   - Baseline metrics scale with the user's completed check-ins for the day plus any simulated activity sessions.
2. **One-Click Sync & Activity Presets:**
   - Clicking **Sync** (`POST /api/health-sync/google/sync`) simulates a fresh wearable sync and appends an entry to **Latest updates** (persisted across page navigation via Pinia `useHealthSyncStore`).
   - Clicking the **Simulation settings** button (`bi-sliders`) opens a preset selector where you can simulate:
     - *Daily activity (+1,850 steps)*
     - *Brisk walk (+2,400 steps, 20m)*
     - *5K outdoor run (+5,200 steps, 30m)*
     - *Gym / HIIT (+1,600 steps, 35m)*
   - You can also **Reset baseline** or **Disconnect / Connect** the simulated feed to test both connected and disconnected states.
3. **Automatic Habit Check-in Sync:**
   - When synced, `server/controllers/healthSyncController.js` inspects the user's active exercise/steps/walk/run/workout habits in Neon PostgreSQL and automatically logs or updates today's check-in count (`check_ins` table) based on the synced steps, active minutes, distance, or calories.

# Google Health connection setup

FitBuddy's Home health card now connects to the real Google Health API. It requests only read access to activity and fitness data (steps, active minutes, distance, and active energy). User refresh tokens are encrypted before they are saved in Neon. A user can revoke the connection from the card.

## Google Cloud setup

1. In Google Cloud, create or select a project, enable the Google Health API, and create an OAuth client with application type **Web application**.
2. Add this authorized redirect URI exactly:

   `https://wad-2-fit-buddy.vercel.app/api/health-sync/google/callback`

3. Set the OAuth consent screen audience to External. While the app is in Testing, add each account that will connect as a test user. Google Health access is restricted and Google may require app verification/security review before wider release.
4. The person connecting must first sign in to the Google Health mobile app and link the same Google account to a Google Health profile.
5. Add these server environment variables in Vercel (Production and Preview as appropriate) and local `server/.env` for development:

   - `GOOGLE_HEALTH_CLIENT_ID` — OAuth client ID
   - `GOOGLE_HEALTH_CLIENT_SECRET` — OAuth client secret
   - `GOOGLE_HEALTH_REDIRECT_URI` — the exact URI above
   - `APP_URL` — `https://wad-2-fit-buddy.vercel.app`
   - `HEALTH_TOKEN_ENCRYPTION_KEY` — a newly generated, long random secret; keep it private and stable so existing saved connections can be decrypted

6. Redeploy Vercel after adding the variables. Users can then choose **Connect** on the Google Health card and approve access.

The card can auto-sync every ten minutes while FitBuddy is open if the user enables that option. Water remains a FitBuddy habit because the Google scope requested here does not include hydration data.

## Other health platforms

This is a browser app. Apple HealthKit is available to native iOS/watchOS apps, not directly to this web app, and Android Health Connect requires an Android app using its Health Connect SDK. FitBuddy would need native iOS/Android companion apps (or a separately permissioned provider cloud API) to connect directly to those stores. Google Health can surface data from supported linked devices and sources, including Google/Fitbit devices and Google sources, but this integration does not claim direct HealthKit or direct Health Connect access.

# Google Calendar sync (end-to-end)

Use the **Sync** button on the Schedule page to link the app to your Google Calendar. After that, use **Export this week to Google Calendar** to push the current week’s schedule (no duplicates on re-export).

---

## 1. Create OAuth credentials in Google Cloud

1. Open **[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Select a project (or create one).
3. **Enable the API:** **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
4. **Credentials** → **Create credentials** → **OAuth 2.0 Client ID**.
5. If asked, configure the **OAuth consent screen** (External, add your email as test user).
6. Application type: **Web application**.
7. **Authorized redirect URIs** → **Add URI**:
   - **Production:** `https://pilates-crm.vercel.app/api/google/auth/callback`  
     (replace with your production URL if different.)
   - **Local:** `http://localhost:3000/api/google/auth/callback`
8. **Create**. Copy the **Client ID** and **Client secret**.

---

## 2. Local development

In the project root, copy `.env.example` to `.env` if needed, then set:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/auth/callback
```

Restart the dev server. **Sync** on the Schedule page will redirect to Google and back to localhost.

---

## 3. Production (Vercel)

From the project root, run:

```bash
chmod +x scripts/setup-google-vercel-env.sh
./scripts/setup-google-vercel-env.sh "YOUR_CLIENT_ID" "YOUR_CLIENT_SECRET"
```

This adds `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to Vercel production.

**Or** add the same variables in the [Vercel project → Settings → Environment Variables](https://vercel.com/dashboard) (Production). Set `GOOGLE_REDIRECT_URI` to:

`https://pilates-crm.vercel.app/api/google/auth/callback`

---

## 4. Redeploy

So the new env vars are used:

```bash
npx vercel --prod --yes
```

Or push a commit (if the repo is linked) or **Redeploy** in the Vercel dashboard.

After that, **Sync** on the Schedule page should redirect to Google and back with the calendar linked. Use **Export this week to Google Calendar** to push the current week (safe to run multiple times).

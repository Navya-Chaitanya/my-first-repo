# Fitness Planner — Vercel deployment

A single-page fitness planner (workout + nutrition) backed by two Vercel
serverless functions:

- `api/generate-plan.js` — calls **Google Gemini**, returns the plan JSON.
- `api/email-plan.js` — emails the plan via **Resend**.

The frontend (`index.html`) calls these as same-origin `/api/...` routes, so
there are no CORS issues and your API keys never touch the browser. If the env
vars aren't set, the app still works in a built-in **mock mode** for previewing.

```
fitness-planner-vercel/
├── index.html            # the app (static)
├── api/
│   ├── generate-plan.js  # Gemini
│   └── email-plan.js     # Resend
├── package.json
├── .env.example
└── .gitignore
```

## 1. Get your keys

- **Gemini API key** → https://aistudio.google.com/apikey (free tier available)
- **Resend API key** → https://resend.com/api-keys (free tier available)

## 2. Deploy

### Option A — GitHub + Vercel dashboard (no CLI)

1. Push this folder to a GitHub repo.
2. At https://vercel.com → **Add New → Project** → import the repo.
3. Framework preset: **Other** (it's static + functions; no build step).
4. Add Environment Variables (Settings → Environment Variables):
   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | `gemini-1.5-flash` (optional) |
   | `RESEND_API_KEY` | your Resend key |
   | `EMAIL_FROM` | leave blank for testing, or `Name <you@yourdomain.com>` |
5. **Deploy.** Your app is live at `https://<project>.vercel.app`.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd fitness-planner-vercel
vercel            # follow prompts to link the project
vercel env add GEMINI_API_KEY
vercel env add RESEND_API_KEY
# (optional) vercel env add GEMINI_MODEL / EMAIL_FROM
vercel --prod
```

### Local preview with live functions

```bash
cp .env.example .env.local   # fill in your keys
vercel dev                   # serves index.html + /api at http://localhost:3000
```

Opening `index.html` directly (file://) runs **mock mode** only — the `/api`
routes need Vercel (`vercel dev` or a deployment) to exist.

## 3. Endpoints

### `POST /api/generate-plan`

Request body = the form profile:

```json
{ "name":"Alex","email":"you@email.com","age":"28","sex":"male",
  "height":"175","weight":"75","goal":"lose","activity":"medium",
  "daysPerWeek":"4","diet":"none","equipment":"gym" }
```

Response:

```json
{
  "workout": { "summary":"...", "days":[ { "day":"Day 1","focus":"Upper",
    "exercises":[ {"name":"Bench Press","sets":4,"reps":"8-12","rest":"2-3 min"} ] } ] },
  "meal": { "calories":2100,"protein":150,"carbs":200,"fat":60,"note":"...",
    "days":[ { "day":"Mon","meals":[ {"meal":"Breakfast","items":"...","kcal":525} ] } ] }
}
```

### `POST /api/email-plan`

```json
{ "email":"you@email.com", "plan": { "workout":{...}, "meal":{...} } }
```

Returns `{ "ok": true, "id": "<resend-id>" }`.

## Notes & next steps

- **Email "from" address:** the default `onboarding@resend.dev` only delivers to
  the email on your own Resend account. To send to anyone, verify a domain in
  Resend and set `EMAIL_FROM`.
- **Model name:** `gemini-1.5-flash` is the cheap default. Swap via `GEMINI_MODEL`
  if you want a stronger/newer model — check the available names in Google AI Studio.
- **Database (optional):** to save plans across devices, add `api/save-plan.js`
  (e.g. writing to Vercel Postgres or Supabase), then set `savePlanWebhook` /
  `loadPlanWebhook` in the config block inside `index.html`.
- **Cost control:** both providers have free tiers; add rate limiting if you make
  the app public.

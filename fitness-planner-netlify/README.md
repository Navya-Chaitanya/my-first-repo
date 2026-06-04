# Fitness Planner — Netlify deployment

A single-page fitness planner (workout + nutrition) backed by two Netlify
Functions:

- `netlify/functions/generate-plan.js` — calls **Google Gemini**, returns the plan JSON.
- `netlify/functions/email-plan.js` — emails the plan via **Resend**.

The frontend (`index.html`) calls `/api/generate-plan` and `/api/email-plan`.
`netlify.toml` rewrites `/api/*` to `/.netlify/functions/*`, so it's same-origin
(no CORS) and your API keys never reach the browser. With no env vars set, the
app still runs in built-in **mock mode** for previewing.

```
fitness-planner-netlify/
├── index.html
├── netlify.toml          # publish dir + /api/* redirect
├── netlify/functions/
│   ├── generate-plan.js  # Gemini
│   └── email-plan.js     # Resend
├── package.json
├── .env.example
└── .gitignore
```

## 1. Get your keys

- **Gemini API key** → https://aistudio.google.com/apikey (free tier)
- **Resend API key** → https://resend.com/api-keys (free tier)

## 2. Deploy

### Option A — Connect a Git repo (recommended)

1. Push this folder to a GitHub/GitLab repo.
2. https://app.netlify.com → **Add new site → Import an existing project** → pick the repo.
3. Build settings are read from `netlify.toml` — leave the build command blank,
   publish directory `.`. Click **Deploy**.
4. **Site settings → Environment variables** → add:
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | `gemini-1.5-flash` (optional) |
   | `RESEND_API_KEY` | your Resend key |
   | `EMAIL_FROM` | blank for testing, or `Name <you@yourdomain.com>` |
5. **Deploys → Trigger deploy** to rebuild with the variables. Live at
   `https://<site>.netlify.app`.

### Option B — Netlify CLI

```bash
npm i -g netlify-cli
cd fitness-planner-netlify
netlify deploy            # draft deploy; link or create a site
netlify env:set GEMINI_API_KEY  your_key
netlify env:set RESEND_API_KEY  your_key
# optional: netlify env:set GEMINI_MODEL gemini-1.5-flash
# optional: netlify env:set EMAIL_FROM "Name <you@yourdomain.com>"
netlify deploy --prod
```

### Option C — Drag & drop

You can drag the folder onto https://app.netlify.com/drop. It deploys the static
site and the functions (because `netlify.toml` and `netlify/functions/` are
included). You'll still need to add the environment variables in Site settings
afterward, then redeploy.

### Local preview with live functions

```bash
cp .env.example .env      # fill in your keys
netlify dev               # serves index.html + /api at http://localhost:8888
```

Opening `index.html` directly (file://) runs **mock mode** only — the `/api`
routes require `netlify dev` or a deployment.

## Endpoints

`POST /api/generate-plan` — body is the form profile; returns `{ workout, meal }`.
`POST /api/email-plan` — body `{ email, plan }`; returns `{ ok: true, id }`.

## Notes

- **Email "from":** default `onboarding@resend.dev` only delivers to your own
  Resend account email. Verify a domain in Resend + set `EMAIL_FROM` to send to anyone.
- **Model:** swap `GEMINI_MODEL` for a newer/stronger Gemini model if you like.
- **Database (optional):** add `netlify/functions/save-plan.js` writing to a DB,
  then set `savePlanWebhook` / `loadPlanWebhook` in the config block in `index.html`.

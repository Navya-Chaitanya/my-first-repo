// Netlify Function: POST /api/email-plan  (-> /.netlify/functions/email-plan)
// Body: { email: string, plan: { workout, meal } }
// Sends the plan via Resend.
//
// Env vars (Netlify -> Site settings -> Environment variables):
//   RESEND_API_KEY - from https://resend.com/api-keys
//   EMAIL_FROM     - optional; defaults to "onboarding@resend.dev" (delivers only
//                    to your OWN Resend account email). For production, verify a
//                    domain in Resend and use "Plans <plans@yourdomain.com>".

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj)
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return json(500, { error: "RESEND_API_KEY is not set on the server." });
  const { from, fallbackTo } = resolveFrom(process.env.EMAIL_FROM);

  const body = safeParse(event.body) || {};
  const { email, plan } = body;
  if (!email || !plan || !plan.workout || !plan.meal) {
    return json(400, { error: "Body must include `email` and a `plan` with workout + meal." });
  }

  // When using the shared onboarding@resend.dev sender, Resend restricts delivery
  // to the account's own verified email address. Use that address as the recipient.
  const to = fallbackTo || email;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: "Your personalized fitness plan",
        html: renderEmail(plan)
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      let parsed; try { parsed = JSON.parse(detail); } catch {}
      const msg = parsed?.message || `HTTP ${r.status}`;
      return json(502, { error: msg });
    }
    const data = await r.json().catch(() => ({}));
    return json(200, { ok: true, id: data.id || null, sentTo: to });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

// Free-provider domains that Resend won't accept as a sender without domain verification.
const FREE_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","hotmail.com","hotmail.co.uk",
  "outlook.com","live.com","icloud.com","me.com","mac.com","aol.com","protonmail.com",
  "proton.me","yandex.com","yandex.ru","mail.com"
]);

// Extract bare email address from a value like "Name <addr>" or "addr".
function extractEmail(val) {
  if (!val) return null;
  const angled = val.match(/<([^>]+)>/);
  if (angled) return angled[1].trim();
  const bare = val.match(/[\w.+%-]+@[\w.-]+/);
  return bare ? bare[0].trim() : null;
}

// Returns { from, fallbackTo }.
// When EMAIL_FROM is a free-provider address, Resend requires the shared onboarding
// sender, which can only deliver to the Resend account's own verified email address.
// fallbackTo carries that account email so the handler can use it as the recipient.
function resolveFrom(envVal) {
  const safe = "Fitness Planner <onboarding@resend.dev>";
  if (!envVal) return { from: safe, fallbackTo: null };
  const match = envVal.match(/@([\w.-]+)$/);
  if (!match) return { from: safe, fallbackTo: null };
  if (FREE_DOMAINS.has(match[1].toLowerCase())) {
    return { from: safe, fallbackTo: extractEmail(envVal) };
  }
  return { from: envVal, fallbackTo: null };
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderEmail(plan) {
  const w = plan.workout, m = plan.meal;
  const card = "background:#141a2e;border:1px solid #2a3350;border-radius:12px;padding:16px;margin:0 0 16px;";
  const th = "text-align:left;color:#94a3b8;font-size:12px;padding:4px 8px;";
  const td = "color:#e2e8f0;font-size:13px;padding:6px 8px;border-top:1px solid #233;";

  const workoutDays = (w.days || []).map(d => `
    <div style="${card}">
      <div style="color:#a5b4fc;font-weight:600;margin-bottom:8px;">${esc(d.day)} · ${esc(d.focus)}</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><th style="${th}">Exercise</th><th style="${th}">Sets</th><th style="${th}">Reps</th><th style="${th}">Rest</th></tr>
        ${(d.exercises || []).map(e => `<tr>
          <td style="${td}">${esc(e.name)}</td><td style="${td}">${esc(e.sets)}</td>
          <td style="${td}">${esc(e.reps)}</td><td style="${td}">${esc(e.rest)}</td></tr>`).join("")}
      </table>
    </div>`).join("");

  const mealDays = (m.days || []).map(d => `
    <div style="${card}">
      <div style="color:#6ee7b7;font-weight:600;margin-bottom:8px;">${esc(d.day)}</div>
      ${(d.meals || []).map(meal => `<div style="color:#e2e8f0;font-size:13px;padding:4px 0;">
        <b>${esc(meal.meal)}</b> — ${esc(meal.items)} <span style="color:#94a3b8;">(${esc(meal.kcal)} kcal)</span></div>`).join("")}
    </div>`).join("");

  return `<div style="background:#0b1020;padding:24px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;">
      <h1 style="color:#fff;font-size:22px;">Your fitness plan</h1>
      <h2 style="color:#c7d2fe;font-size:16px;">Workout — ${esc(w.summary || "")}</h2>
      ${workoutDays}
      <h2 style="color:#a7f3d0;font-size:16px;">Nutrition — ${esc(m.calories)} kcal · ${esc(m.protein)}P / ${esc(m.carbs)}C / ${esc(m.fat)}F</h2>
      <p style="color:#94a3b8;font-size:13px;">${esc(m.note || "")}</p>
      ${mealDays}
      <p style="color:#475569;font-size:12px;margin-top:24px;">Generated by your Fitness Planner.</p>
    </div>
  </div>`;
}

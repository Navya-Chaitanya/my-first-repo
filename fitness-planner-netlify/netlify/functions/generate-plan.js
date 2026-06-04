// Netlify Function: POST /api/generate-plan  (-> /.netlify/functions/generate-plan)
// Body: the user profile from the form.
// Returns: { workout: {...}, meal: {...} }
//
// Env vars (set in Netlify -> Site settings -> Environment variables):
//   GEMINI_API_KEY   - from https://aistudio.google.com/apikey
//   GEMINI_MODEL     - optional, defaults to "gemini-1.5-flash"

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj)
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: "GEMINI_API_KEY is not set on the server." });
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const p = safeParse(event.body) || {};
  const prompt = buildPrompt(p);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
      })
    });

    if (!r.ok) {
      const detail = await r.text();
      return json(502, { error: "Gemini request failed", status: r.status, detail });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const plan = safeParse(text);
    if (!plan || !plan.workout || !plan.meal) {
      return json(502, { error: "Model did not return the expected JSON.", raw: text });
    }
    return json(200, plan);
  } catch (e) {
    return json(500, { error: e.message });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch {
    const m = String(s || "").match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

function buildPrompt(p) {
  return `You are a certified strength coach and registered dietitian.
Create a personalized fitness plan for this person:

- Name: ${p.name || "N/A"}
- Age: ${p.age}, Sex: ${p.sex}
- Height: ${p.height} cm, Weight: ${p.weight} kg
- Goal: ${p.goal}            (lose = fat loss, maintain, gain = build muscle)
- Activity level: ${p.activity}
- Training days per week: ${p.daysPerWeek}
- Equipment: ${p.equipment}  (gym = full gym, home = dumbbells, bodyweight = none)
- Dietary preference: ${p.diet}

Requirements:
- The workout must have exactly ${p.daysPerWeek} training days, structured for the goal and equipment.
- Use a sensible split (e.g. push/pull/legs or upper/lower) and 4-6 exercises per day.
- Calorie target and macros must suit the goal and bodyweight.
- The meal plan covers all 7 days (Mon-Sun) with 4 meals each that respect the dietary preference.

Respond with ONLY valid JSON, no markdown, no commentary, matching EXACTLY this schema:

{
  "workout": {
    "summary": "string",
    "days": [
      { "day": "Day 1", "focus": "string",
        "exercises": [ { "name": "string", "sets": 4, "reps": "8-12", "rest": "2-3 min" } ] }
    ]
  },
  "meal": {
    "calories": 2100, "protein": 150, "carbs": 200, "fat": 60,
    "note": "string",
    "days": [
      { "day": "Mon", "meals": [ { "meal": "Breakfast", "items": "string", "kcal": 525 } ] }
    ]
  }
}`;
}

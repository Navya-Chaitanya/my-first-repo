import type { Context, Config } from '@netlify/functions'
import { GoogleGenAI } from '@google/genai'
import nodemailer from 'nodemailer'

// Build the Gemini prompt from the client's onboarding answers.
function constructPrompt(data: Record<string, string>) {
  return `You are a elite personal trainer and expert sports nutritionist. Create a highly personalized, premium, and professional workout plan and dietary/meal plan for the following client:
      Client Profile:
      - Name: ${data.name}
      - Email: ${data.email}
      - Height: ${data.height}
      - Weight: ${data.weight}
      - Target Weight: ${data.targetWeight}
      - Fitness Goals: ${data.goals}
      - Level of Commitment / Weekly Frequency: ${data.commitment}
      - Dietary Restrictions / Allergies: ${data.dietary || 'None'}
      - Workout Environment (Home/Gym/Equipment): ${data.environment || 'Not specified'}
      - Medical Conditions / Past Injuries: ${data.medical || 'None'}

      Please generate a comprehensive, highly actionable plan in MARKDOWN format.
      Use the following structured sections:
      1. Executive Summary & Assessment
      2. Custom Weekly Workout Program (exercises, sets, reps, rest)
      3. Custom Daily Meal Plan (breakfast, lunch, dinner, snacks, water matching dietary limits)
      4. Supplement & Recovery Guidelines
      5. Trainer's Rules for Success

      Output ONLY clean Markdown. Do not wrap it in HTML tags. Make it readable, motivational, and detailed.`
}

// Create a mail transporter. Uses configured SMTP if present, otherwise falls
// back to an ephemeral Ethereal test inbox so the flow still works end to end.
async function getMailTransporter() {
  const host = Netlify.env.get('SMTP_HOST')
  const user = Netlify.env.get('SMTP_USER')
  const pass = Netlify.env.get('SMTP_PASS')

  if (host && user && pass) {
    const port = parseInt(Netlify.env.get('SMTP_PORT') || '587')
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }

  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const formData = (await req.json()) as Record<string, string>

    const requiredFields = ['name', 'email', 'height', 'weight', 'targetWeight', 'goals', 'commitment']
    for (const field of requiredFields) {
      if (!formData[field]) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // AI Gateway injects the Gemini credentials, so no API key is required here.
    const ai = new GoogleGenAI({})

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: constructPrompt(formData),
    })

    const generatedPlanMarkdown = response.text
    if (!generatedPlanMarkdown) {
      throw new Error('No content returned from Gemini API.')
    }

    // Attempt to email the plan. Failure here never blocks plan delivery.
    let emailSent = false
    let previewUrl: string | null = null
    let emailError: string | null = null

    try {
      const transporter = await getMailTransporter()
      const mailOptions = {
        from: Netlify.env.get('SMTP_FROM') || '"Make me Fit Personal Trainer" <trainer@makemefit.com>',
        to: formData.email,
        subject: `Your Personalized Make me Fit Workout & Meal Plan - ${formData.name}`,
        text: generatedPlanMarkdown,
        html: `
          <div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; max-width: 700px; margin: 0 auto; padding: 30px; border-radius: 16px; border: 2px solid #10b981;">
            <div style="text-align: center; border-bottom: 2px dashed rgba(16, 185, 129, 0.3); padding-bottom: 20px; margin-bottom: 25px;">
              <span style="font-size: 2.2em; font-weight: 800; color: #10b981; letter-spacing: -1px; text-transform: uppercase;">MAKE ME FIT &#10022;</span>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 1.1em; font-weight: 500;">YOUR CUSTOM ATHLETIC BLUEPRINT</p>
            </div>

            <p style="font-size: 1.1em; color: #cbd5e1; line-height: 1.7;">Hello <strong style="color: #10b981;">${formData.name}</strong>,</p>
            <p style="color: #94a3b8; line-height: 1.7;">We have engineered your personalized fitness and nutrition program using advanced AI. Your rules for success, daily meal plans, and customized workout splits are structured below. Stay dedicated, execute the plan, and get results.</p>

            <div style="background-color: rgba(16, 185, 129, 0.08); border-left: 5px solid #10b981; padding: 18px; margin: 25px 0; border-radius: 8px;">
              <p style="margin: 0; font-weight: bold; color: #10b981; font-size: 1.05em; text-transform: uppercase;">&#10022; Ready For Action</p>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 0.95em; line-height: 1.6;">Below is your actionable program. We suggest bookmarking this email or printing it out for physical tracking.</p>
            </div>

            <div style="background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 30px; margin-top: 25px;">
              ${generatedPlanMarkdown
                .replace(/\n/g, '<br/>')
                .replace(/### (.*?)(<br\/>|$)/g, '<h4 style="color: #10b981; font-size: 1.25em; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; border-left: 3px solid #10b981; padding-left: 8px;">$1</h4>')
                .replace(/## (.*?)(<br\/>|$)/g, '<h3 style="color: #10b981; border-bottom: 2px solid rgba(16, 185, 129, 0.2); padding-bottom: 8px; margin-top: 35px; font-size: 1.45em; text-transform: uppercase;">$1</h3>')
                .replace(/# (.*?)(<br\/>|$)/g, '<h2 style="color: #f8fafc; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-top: 40px; font-size: 1.8em; text-transform: uppercase;">$1</h2>')
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #10b981;">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em style="color: #94a3b8;">$1</em>')
              }
            </div>

            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="font-size: 0.85em; color: #64748b; margin: 0;">
                This email was automatically generated and sent to ${formData.email} by Make me Fit App. Keep pushing!
              </p>
            </div>
          </div>
        `,
      }

      const info = await transporter.sendMail(mailOptions)
      previewUrl = nodemailer.getTestMessageUrl(info) || null
      emailSent = true
    } catch (mailErr) {
      emailError = mailErr instanceof Error ? mailErr.message : 'Unknown email error'
    }

    return Response.json({
      success: true,
      plan: generatedPlanMarkdown,
      emailSent,
      emailError,
      previewUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred while generating your plan.'
    return Response.json({ error: message }, { status: 500 })
  }
}

export const config: Config = {
  path: '/api/generate-plan',
}

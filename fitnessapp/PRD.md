# Product Requirements Document (PRD): FlexiFit AI Trainer

## 1. Executive Summary & Objectives
FlexiFit AI is an automated Personal Trainer onboarding portal designed for local deployment and simple deployment to production servers. The application gathers client biometrics, goals, fitness limitations, and nutritional parameters, then uses generative artificial intelligence (Gemini 2.5 Flash) to generate and email a highly personalized training and nutrition program.

The main objectives are:
- Provide an intuitive, modern, and high-quality onboarding experience.
- Abstract API complexity and secure API keys on the server backend.
- Dynamically deliver structured personal training programs to client inboxes.
- Handle SMTP sandbox and delivery limitations gracefully without breaking user experience.

---

## 2. Target Audience
- **Fitness Enthusiasts/Clients**: Users looking for tailored workout plans and diet regimes matching their personal constraints (equipment availability, injuries, food preferences).
- **Personal Trainers**: Trainers looking to automate initial client assessments and deliver custom intake drafts instantly.

---

## 3. Product Features & Functional Requirements

### 3.1. User Intake Questionnaire (Frontend)
- **Single-page Layout**: The intake process is consolidated into a single form page with organized sections:
  - **Basics**: Name, Email.
  - **Biometrics**: Height (in), Current Weight (lbs), Target Weight (lbs).
  - **Fitness Goals**: Fitness goals (free-form textarea), Weekly commitment frequency, Training environment (Gym/Home/Outdoors).
  - **Health & Diet**: Dietary restrictions/allergies, Joint sensitivities/medical conditions.
- **Client-side Validation**: All required fields must be validated on submit. User is notified of missing required inputs.

### 3.2. Loading & State Indications
- A customized loading indicator spinner must display during AI plan generation.
- Clear status text should describe the process: "Designing Your Plan..."

### 3.3. Blueprint Generation (Backend AI)
- The server will accept the payload, compile a highly specific personal trainer system prompt, and make a request to the Google Gen AI API using the `gemini-2.5-flash` model.
- The output format must be returned as clean Markdown.

### 3.4. Email Blueprint Dispatch
- The generated blueprint must be compiled and sent to the user's email address using Nodemailer SMTP.
- **Ethereal Mail Fallback**: If SMTP settings are left blank in `.env`, the server automatically creates a temporary test email box (Ethereal.email) and returns a link to inspect the sent HTML email.
- **Graceful Error Handling**: If the email service fails, the system must catch the error, successfully display the plan to the user on-screen, and print a warning message notifying them about the SMTP dispatch error instead of failing the request.

### 3.5. On-Screen Blueprint Display
- The generated Markdown must render dynamically using a parser library (`marked.js`) within a scrollable, glassmorphic layout card.
- Provide action buttons for:
  - **Print Plan**: Formats the output for physical paper or save-to-PDF using browser printing styles.
  - **Create Another Plan**: Resets form states and navigates back to Step 1.

---

## 4. Technical Architecture
- **Frontend**: Single-page application built on HTML5, Vanilla CSS3 (custom CSS variables, glassmorphic styles, keyframe animations), and vanilla ES6 JavaScript. No compilation step required.
- **Backend**: Node.js & Express server hosting static assets and providing a single `/api/generate-plan` API route.
- **SDK & Services**:
  - AI Engine: `@google/genai` SDK.
  - Mailer: `nodemailer` library.

---

## 5. Security & Configuration
All credentials must be loaded securely via a `.env` file at root level:
- `PORT`: Server port (default 3000).
- `GEMINI_API_KEY`: API Key for Google AI Studio.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: SMTP credentials.
- `SMTP_FROM`: Custom Sender Name and Email (e.g., `Personal Trainer <onboarding@resend.dev>`).

---

## 6. Future Enhancements
- **User Dashboard**: Save generated plans using LocalStorage or a cloud database so clients can access past weeks.
- **Workout Timer**: Interactive timer for exercises inside the plan view.
- **AI Chatbot**: Inline chat interface where clients can ask follow-up questions to customize their workout directly.

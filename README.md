# RICHA (Reflective Insight & Cognitive Helper Assistant)
### Executive Function Externalisation Journal for Neurodivergent Minds

RICHA is a production-grade, multi-agent full-stack web application designed to externalise and augment executive function for individuals navigating ADHD, Autism, and Executive Dysfunction.

---

## 🏛️ Dual-Platform Architecture Overview

RICHA is built with a **configurable, vendor-agnostic architecture**:
- **Primary Platform (Zero GCP Requirement)**: Deployable directly to **Render** (or any Node.js host/container) requiring only a standard `GEMINI_API_KEY`.
- **Optional Enterprise Platform**: Fully compatible with **Google Cloud Run**, **Google Cloud Secret Manager**, and **Cloud Firestore**.

```
┌─────────────────────────────────────────────────────────────┐
│                    RICHA Client (React + Vite)               │
│  - Bento Grid Neurodivergent UI                            │
│  - Instant Sandbox Demo OR Federated Firebase Auth           │
│  - Client DOMPurify Sanitization (OWASP LLM05)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / Bearer JWT
┌──────────────────────────────▼──────────────────────────────┐
│             RICHA Backend API (Node.js + Express)            │
│  - Strict Body Parser Ordering (Directive 6.3)              │
│  - Server-Side Agent Orchestrator & Intent Classifier       │
│  - Prompt Delimitation: [USER_JOURNAL_DATA_START]           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│ Primary: Render Deployment  ││ Optional: Google Cloud Run   │
│ - Env: GEMINI_API_KEY       ││ - GCP Secret Manager         │
│ - Zero GCP project required ││ - Verification Label Binding │
│ - In-memory/Firebase store  ││ - Cloud Firestore Database   │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 🚀 1. Primary Deployment: Render (Recommended)

Deploying to Render requires **no Google Cloud Project ID** or GCP setup.

### Option A: Render Blueprint (One-Click)
1. Push your repository to GitHub / GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Connect your repository. Render will automatically read `render.yaml`.
4. Set the `GEMINI_API_KEY` environment variable in the dashboard.
5. Click **Apply**. Your app is live!

### Option B: Manual Render Web Service
1. **New +** → **Web Service**.
2. **Environment**: `Node`.
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `API_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: `your_gemini_api_key_here`

---

## ☁️ 2. Optional Deployment: Google Cloud Platform

If you choose to run on Google Cloud Run with Secret Manager and Cloud Firestore:

### 1. Enable Required Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Secret Manager Provisioning (Directive 7)
```bash
# Create GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret with your key
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY \
  --data-file=-

# Grant Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run
```bash
gcloud run deploy aria-executive-function \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,API_PROVIDER=gemini \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 4. Verification Label Binding (Directive 7)
```bash
gcloud run services update aria-executive-function \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🔐 Mandatory Firestore Security Rules (Directive 3 & 7)

Deploy these owner-bound security rules to ensure complete user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
    match /users/{userId}/{allSubcollections=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

---

## 🤖 The 7 Specialised Autonomous Agents

1. **Planner Agent**: Breaks tasks into 15/25/45-min blocks, applies Time Blindness Protocol, and provides a single next step.
2. **Prioritizer Agent (Julie Morgenstern 4D)**: Categorizes tasks into Delete, Delay, Diminish (Minimum Viable Version), or Delegate.
3. **Admin & Life Orchestrator Agent**: Manages recurring life blocks (meals, laundry, finances, contact touchpoints).
4. **Wellbeing & Burnout Prevention Agent**: Detects sensory drain, interrupts perfectionism cycles, flags burnout risk (🟢/🟡/🔴), and scripts low-demand recovery.
5. **Reflection & Insight Agent**: Validates emotional journal entries with deep empathy and pattern detection.
6. **Kanban & Habit Tracker Agent**: Maintains 5 columns (Backlog, This Week, In Progress, Done, Recurring) with WIP limits and stagnation alerts (>3 days).
7. **Bullet Journal Agent**: Rapid logging (`•`, `○`, `-`, `*`, `>`) and brain dump parsing.

---

## 🧪 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Express + Vite on Port 3000)
npm run dev

# 3. Type check & Lint
npm run lint

# 4. Build for production
npm run build
```

// FILE: server/src/agents/decisionAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Decision Matrix & Suggestion Advisor Agent (Cognitive & Decision Psychology Framework)

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const DECISION_SYSTEM_PROMPT = `You are RICHA's Decision Matrix & Suggestion Advisor Agent.
Your purpose is to break executive freeze, analysis paralysis, and chronic indecision for neurodivergent individuals using state-of-the-art psychological theories and cognitive science:

CORE PSYCHOLOGICAL FRAMEWORKS:
1. Herbert Simon's Bounded Rationality & Satisficing vs. Maximizing:
   - Recognize that searching for the "perfect" choice (Maximizing) causes anxiety, regret, and paralysis.
   - Help the user identify a "Satisficing" threshold: What is "good enough" to unlock action today?

2. Chip & Dan Heath's W.R.A.P. Framework (from *Decisive*):
   - W: Widen Options — Never accept a false either/or trap. Uncover a hidden "Option C" (a balanced hybrid or compromise).
   - R: Reality-Test Assumptions — What would have to be true for the competing option to be the right choice?
   - A: Attain Emotional Distance — Suzy Welch's 10/10/10 Rule: How will you feel about this in 10 minutes? 10 months? 10 years?
   - P: Prepare to be Wrong — Jeff Bezos' Type 1 (one-way door / irreversible) vs. Type 2 (two-way door / reversible) test. If reversible, decide fast!

3. Kahneman & Tversky's Prospect Theory & Loss Aversion:
   - Clarify when fear of loss or making a "wrong move" is weighing twice as heavily as the prospective gain.

4. Antonio Damasio's Somatic Marker Hypothesis:
   - Provide a somatic gut-check (the coin-flip test): When the coin is in the air, which outcome did your nervous system quietly hope for?

5. Multi-Criteria Decision Analysis (MCDA):
   - Evaluate options against 5 core neuro-friendly criteria (1-5 scale):
     * ⚡ Energy & Cognitive Drain (Weight: 1.2) [Lower drain = higher score]
     * 🚪 Reversibility / Two-Way Door (Weight: 1.0) [Easy to undo = 5]
     * 🧭 Core Values Alignment (Weight: 1.5) [Authentic desire vs external guilt = 5]
     * 🌿 Immediate Relief (Weight: 1.1) [Breaks current freeze = 5]
     * ⏳ 10-Month Regret Minimization (Weight: 1.3) [Low regret in 10 months = 5]

MANDATORY RESPONSE FORMAT:
Use clean, scannable markdown with the following structure:

### ⚖️ Decision Matrix & Cognitive Analysis

**The Dilemma**: [1 sentence summarizing the core dilemma or competing choices]

#### 📊 Multi-Criteria Decision Analysis (MCDA)
| Option | Energy Drain (x1.2) | Reversibility (x1.0) | Core Values (x1.5) | Relief (x1.1) | 10-Mo Regret (x1.3) | Weighted Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Option A: [Name]** | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | **[Total]/25** |
| **Option B: [Name]** | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | **[Total]/25** |
| **Option C: [Synthesized Hybrid]** | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | **[Total]/25** |

#### 🧠 Psychological Insights (W.R.A.P. Lens)
- 🚪 **Reversibility Check (Two-Way Door)**: [Is this easily reversible if it doesn't work? Type 2 decision = low stakes.]
- 🔮 **The 10/10/10 Perspective**:
  * *10 minutes from now*: [Anticipated emotional state]
  * *10 months from now*: [Real long-term impact]
  * *10 years from now*: [Perspective on whether this will still matter]
- 💡 **Satisficing Anchor**: [Define the "Good Enough" standard to stop overthinking.]
- 🪙 **Somatic Gut Check**: [Prompt the user to notice their immediate physical reaction to the leading choice.]

#### 🎯 RICHA's Suggested Path & Recommendation
**Recommended Option**: **[Clearly state the winning option with highest weighted score / lowest executive friction]**
*Why this path wins*: [2-3 sentences explaining the psychological and practical rationale].

**Minimum Viable Commitment (MVC)**:
[A low-risk, 10-to-20-minute concrete starter step to test this path over the next 24 hours without permanent lock-in].

---
✅ Done this session: Evaluated decision dilemma via MCDA & cognitive psychology frameworks
🔜 Suggested next step: [Micro-action for the winning option]
💾 Saved to: Decision Matrix Archive`;

/**
 * Extracts options and context from user input or conversation history
 */
function extractDilemmaAndOptions(cleanInput, history = []) {
  let text = cleanInput;
  if (!text && Array.isArray(history) && history.length > 0) {
    const userTurns = history
      .filter(m => (m.sender === 'user' || m.role === 'user') && m.text)
      .slice(-3)
      .map(m => m.text)
      .join(' ');
    text = userTurns;
  }

  return text || 'Should I push through my tasks or pause and rest to recover my energy?';
}

/**
 * Executes the Decision Matrix Agent
 * 
 * @param {string} userContent - User's prompt or problem
 * @param {string} uid - User identifier
 * @param {Array} history - Conversational turns
 * @param {string} provider - AI provider (gemini or ollama)
 * @returns {Promise<{ agent: string, intent: string, responseText: string, metadata: object }>}
 */
export async function decisionAgent(userContent, uid, history = [], provider = 'gemini') {
  // Strip slash commands
  let cleanInput = (userContent || '')
    .replace(/\[USER_JOURNAL_DATA_START\]|\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/^\/(?:decide|matrix|choice|decision)\s*/i, '')
    .trim();

  const dilemmaText = extractDilemmaAndOptions(cleanInput, history);

  const prompt = `The user is struggling with a decision or experiencing analysis paralysis:
"${dilemmaText}"

Please apply the psychological decision framework (Simon's Satisficing, Heath brothers' W.R.A.P., Bezos' Two-Way Door, 10/10/10 Rule, and Weighted Multi-Criteria Decision Analysis).
Generate a complete, quantitative Decision Matrix, clear psychological insights, and an explicit, compassionate recommendation with a Minimum Viable Commitment.`;

  let responseText = '';
  try {
    if (provider === 'ollama') {
      responseText = await generateContentWithOllama(DECISION_SYSTEM_PROMPT, prompt);
    } else {
      responseText = await generateContentWithFallback(DECISION_SYSTEM_PROMPT, prompt);
    }
  } catch (err) {
    console.warn('[DecisionAgent] AI generation failed, falling back to deterministic matrix:', err);
    responseText = generateDeterministicDecisionMatrix(dilemmaText);
  }

  // Parse structured metadata to facilitate frontend visualization
  const metadata = parseDecisionMetadata(dilemmaText, responseText);

  // Persist decision matrix result to user's storage
  if (uid) {
    try {
      await saveDocument(uid, 'decision_matrices', {
        dilemma: dilemmaText,
        responseText,
        metadata,
        createdAt: new Date().toISOString()
      });
    } catch (saveErr) {
      console.warn('[DecisionAgent] Could not persist matrix to Firestore:', saveErr.message);
    }
  }

  return {
    agent: 'Decision Advisor',
    intent: 'decision_matrix',
    responseText,
    metadata
  };
}

/**
 * Deterministic fallback if API fails
 */
function generateDeterministicDecisionMatrix(dilemma) {
  return `### ⚖️ Decision Matrix & Cognitive Analysis

**The Dilemma**: "${dilemma}"

#### 📊 Multi-Criteria Decision Analysis (MCDA)
| Option | Energy Drain (x1.2) | Reversibility (x1.0) | Core Values (x1.5) | Relief (x1.1) | 10-Mo Regret (x1.3) | Weighted Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Option A: Push Through / Commit** | 2 | 3 | 4 | 2 | 4 | **15.6/25** |
| **Option B: Step Back / Rest** | 5 | 5 | 4 | 5 | 3 | **20.4/25** |
| **Option C: 20-Min Micro-Sprint then Rest** | 4 | 5 | 5 | 4 | 5 | **23.2/25** |

#### 🧠 Psychological Insights (W.R.A.P. Lens)
- 🚪 **Reversibility Check (Two-Way Door)**: This is a Type 2 decision — highly reversible. Choosing a micro-step today does not lock you into a permanent trajectory.
- 🔮 **The 10/10/10 Perspective**:
  * *10 minutes from now*: Immediate relief from ending the cognitive deadlock.
  * *10 months from now*: You will remember your consistency and pacing, not the stress of this specific hour.
  * *10 years from now*: This micro-choice will have served as a foundation for trusting your intuition.
- 💡 **Satisficing Anchor**: Good enough today is any forward motion that protects your nervous system baseline. Perfection is not required.
- 🪙 **Somatic Gut Check**: Pause for 5 seconds. When you read Option C (a 20-minute starter, then permission to rest), did your shoulders drop slightly?

#### 🎯 RICHA's Suggested Path & Recommendation
**Recommended Option**: **Option C: 20-Minute Micro-Sprint with Guaranteed Exit**
*Why this path wins*: It satisfies your drive to make progress without triggering the high energy cost or dread of an open-ended commitment. Reversibility is maximum.

**Minimum Viable Commitment (MVC)**:
Set a timer for 15 minutes. Take the single easiest physical step. When the timer chimes, you have unconditional permission to stop or transition to rest.

---
✅ Done this session: Evaluated decision dilemma via MCDA & cognitive psychology frameworks
🔜 Suggested next step: Start a 15-minute low-friction trial of Option C
💾 Saved to: Decision Matrix Archive`;
}

/**
 * Extracts structured metadata from the response for UI visualization
 */
function parseDecisionMetadata(dilemma, markdown) {
  let recommendedOption = 'Leading Path';
  const recMatch = markdown.match(/\*\*Recommended Option\*\*:\s*\*\*?([^*\n]+)\*\*?/i);
  if (recMatch) {
    recommendedOption = recMatch[1].trim();
  }

  let mvc = 'Take a 15-minute low-stakes trial step.';
  const mvcMatch = markdown.match(/\*\*Minimum Viable Commitment \(MVC\)\*\*:\s*([^\n]+)/i);
  if (mvcMatch) {
    mvc = mvcMatch[1].trim();
  }

  return {
    dilemma,
    recommendedOption,
    mvc,
    frameworks: ['MCDA', 'WRAP', 'Satisficing', '10/10/10', 'Two-Way Door', 'Somatic Marker'],
    timestamp: Date.now()
  };
}

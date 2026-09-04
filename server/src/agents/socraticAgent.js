// FILE: server/src/agents/socraticAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Socratic Reasoning & Executive Function Inquiry Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const SOCRATIC_SYSTEM_PROMPT = `You are RICHA's Socratic Executive Function & Reasoning Coach.
Your purpose is to engage the user in gentle, non-judgmental Socratic dialogue to help them overcome executive dysfunction, cognitive freeze, decision paralysis, and perfectionism.

CORE PRINCIPLES:
1. Socratic Questioning: Don't just lecture or give generic advice. Ask illuminating, low-pressure questions that help the user uncover their own barriers, examine assumptions, and find their Minimum Viable Version (MVV).
2. Cognitive Friction Unpacking: Help examine what specific step triggers resistance (sensory hurdle? fear of imperfection? working memory overload? physical transition friction?).
3. Safe Follow-up Exploration:
   - Challenge perfectionism gently: "What happens if this is done at 60% quality instead of 100%?"
   - Challenge marathon thinking: "What if you stopped after 15 minutes, no matter where you are?"
   - Challenge sensory friction: "Is the kitchen too cold, too loud, or physically uninviting right now?"
4. Multi-turn Continuity: Always acknowledge and reason directly upon what the user replied to your previous probe.

RESPONSE FORMAT:
Use clean, scannable markdown:

### 🧠 Socratic Reasoning & Reflection
[2-3 concise sentences exploring the nuance of what the user just stated. Validate the cognitive load while gently examining the underlying assumption or friction point.]

#### 🔍 Reflective Probes (Questions to Consider):
1. **[Core Probe 1]**: [A thoughtful Socratic question about the immediate friction]
2. **[Alternative Angle 2]**: [A question offering a radical simplification or perspective shift]

#### 💡 Low-Friction Refinement:
[A concrete, tailored refinement of the plan or task based on their answer.]

---
✅ Done this session: Explored cognitive friction via Socratic reasoning
🔜 Suggested next step: [Provide a 60-second micro-action]
💾 Saved to: Socratic Reasoning Journal`;

/**
 * Executes Socratic reasoning and follow-up
 * 
 * @param {string} userReflection - User's response or follow-up question
 * @param {object} context - Context containing agentSource, originalTask, agentOutput
 * @param {string} uid - User UID
 * @param {Array} history - Past turns
 * @param {string} provider - 'gemini' | 'ollama'
 * @returns {Promise<{ reply: string, probes: string[], quickReplies: string[], agent: string }>}
 */
export async function socraticAgent(userReflection, context = {}, uid, history = [], provider = 'gemini') {
  const { agentSource = 'prioritizer', originalTask = '', agentOutput = '' } = context;

  const prompt = `CONTEXT OF RECENT ACTIVITY:
- Source Agent/Tool: ${agentSource}
- Original Task or Items: ${originalTask}
- Previous Output Provided to User:
${agentOutput.slice(0, 800)}

USER'S CURRENT REFLECTION / FOLLOW-UP:
"${userReflection}"

Engage with the user using Socratic inquiry. Reflect on their specific response, examine the cognitive bottleneck, offer 2-3 deep questions, and propose an actionable refinement.`;

  let aiResult;
  if (provider === 'ollama') {
    aiResult = await generateContentWithOllama(prompt, SOCRATIC_SYSTEM_PROMPT);
  } else {
    aiResult = await generateContentWithFallback(prompt, SOCRATIC_SYSTEM_PROMPT);
  }

  const responseText = aiResult.text;
  const sessionId = `socratic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Parse probes and suggested quick replies from response text
  const probes = [];
  const probeMatches = responseText.match(/\d+\.\s*\*\*([^*]+)\*\*:\s*([^\n\r]+)/g);
  if (probeMatches) {
    for (const match of probeMatches.slice(0, 3)) {
      const clean = match.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim();
      probes.push(clean);
    }
  }

  // Generate 3 contextual quick-reply chips for decision fatigue
  const quickReplies = [
    "I'm feeling stuck on how to take the first step",
    "What if I only do the 5-minute version?",
    "I'm worried about falling behind if I postpone this",
    "Walk me through the first 60 seconds physically"
  ];

  try {
    if (uid) {
      await saveDocument(uid, 'socratic_sessions', sessionId, {
        agentSource,
        originalTask,
        userReflection,
        aiResponse: responseText,
        probes,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('[SocraticAgent] Persistence error:', err.message);
  }

  return {
    reply: responseText,
    responseText: responseText,
    probes: probes.length > 0 ? probes : [
      "What feels like the biggest sensory or cognitive friction point right now?",
      "If you could only do one tiny piece today and let everything else slide, what would you choose?"
    ],
    quickReplies,
    agent: 'Socratic Coach',
    modelUsed: aiResult.modelUsed
  };
}

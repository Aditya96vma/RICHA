// FILE: server/src/agents/socraticAgent.js
// SECURITY: Directive 2 (OWASP LLM01, LLM02), Directive 3 (User Isolation), Directive 6.4 (Persistence)
// AGENT: Socratic Reasoning & Executive Function Inquiry Agent

import { generateContentWithFallback } from '../utils/geminiHelper.js';
import { generateContentWithOllama } from '../utils/ollamaHelper.js';
import { saveDocument } from '../utils/firestoreHelper.js';

const SOCRATIC_SYSTEM_PROMPT = `You are RICHA's Socratic Executive Function & Reasoning Coach.
Your purpose is to engage the user in gentle, non-judgmental Socratic dialogue to help them overcome executive dysfunction, cognitive freeze, decision paralysis, burnout, and perfectionism across ALL life domains.

DOMAIN-SPECIFIC SOCRATIC INQUIRY DIRECTIVES:
- PLANNER: Probe task initiation friction, perfectionist scoping, and time blindness. Ask: "What makes step 1 feel like a wall?", "What if you tested a 3-minute starter with zero commitment to finish?"
- PRIORITIZER (4D): Probe guilt-driven retention of tasks. Ask: "Are you keeping this purely out of perceived obligation?", "What real consequence occurs if this is delayed to next week?"
- LIFE ADMIN: Probe chore dread, administrative paperwork freeze, and transition inertia. Ask: "Can the setup phase be reduced to 60 seconds?", "What physical friction (clutter, distance, noise) is blocking you?"
- WELLBEING / SENSORY SHIELD: Probe toxic productivity, masking fatigue, and rest guilt. Ask: "Why does your nervous system treat rest as earned rather than essential maintenance?", "What sensory input is overloading you?"
- BRAIN DUMP / BULLET LOG: Probe cognitive flooding and triage anxiety. Ask: "Which of these items holds the most emotional charge?", "What can be safely archived without regret?"
- KANBAN FLOW: Probe task stagnation and WIP overload. Ask: "Has this card stayed in 'In Progress' because it's secretly 3 tasks?", "What is the very first physical movement needed to move it to Done?"
- HABITS: Probe streak perfectionism and all-or-nothing thinking. Ask: "Can we shrink this to a 60-second version to preserve identity without demanding high executive energy?"
- JOURNAL & REFLECTION: Probe self-criticism, cognitive distortions, and unexamined 'shoulds'. Ask: "What unspoken standard are you holding yourself to?", "What would you tell a friend feeling this exact fatigue?"

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
 * Returns contextual quick-reply chips tailored to the agent domain
 */
function getContextualQuickReplies(agentSource) {
  switch (agentSource) {
    case 'planner':
      return [
        "I'm dreading Step 1 — help me make it smaller",
        "What if I set a 5-minute timer and stop?",
        "I keep overthinking the setup and environment",
        "What's the absolute lowest-energy starter?"
      ];
    case 'prioritizer':
      return [
        "I feel guilty deleting anything from this list",
        "Help me diminish the top priority task down",
        "I'm worried about missing something important",
        "How do I let go of delayed tasks without anxiety?"
      ];
    case 'admin':
      return [
        "What makes starting this chore so exhausting?",
        "Can I automate or skip half of this routine?",
        "What if I only do 5 minutes of prep today?",
        "How do I eliminate the paperwork dread?"
      ];
    case 'wellbeing':
      return [
        "I feel guilty resting while so much is unfinished",
        "How do I say no to demands without apologizing?",
        "Guide me through a 2-minute nervous system reset",
        "Am I masking or pushing past my sensory limit?"
      ];
    case 'braindump':
      return [
        "Which of these starred items actually matters today?",
        "Can I migrate non-essentials to next week safely?",
        "Help me extract just ONE physical action from this dump",
        "The volume of my thoughts is making me freeze"
      ];
    case 'kanban':
      return [
        "Why has this specific card been stuck in In Progress?",
        "Is this card actually 3 different tasks disguised as one?",
        "Help me reduce my active WIP so I stop thrashing",
        "What is the single physical starter movement for this card?"
      ];
    case 'habits':
      return [
        "Why is this habit slipping when I get overwhelmed?",
        "How can we shrink this to a 60-second atomic habit?",
        "Can we attach this to an existing sensory anchor?",
        "I feel like a failure when my streak breaks"
      ];
    case 'journal':
    case 'general':
    default:
      return [
        "What assumption am I making about what today was supposed to look like?",
        "Help me reframe my self-criticism into compassionate curiosity",
        "What is the single thing I need to hear right now?",
        "How do I honor my neurodivergent rhythm without guilt?"
      ];
  }
}

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

  // Generate contextual quick-reply chips for decision fatigue tailored to this agent
  const quickReplies = getContextualQuickReplies(agentSource);

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

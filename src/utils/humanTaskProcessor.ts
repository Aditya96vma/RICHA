// FILE: src/utils/humanTaskProcessor.ts
// Intelligent human task extraction, real-world activity classification, and neurodivergent plan synthesis.

export interface HumanActivity {
  raw: string;
  cleanName: string;
  type: 'food' | 'hygiene' | 'study' | 'chore' | 'work' | 'admin' | 'rest' | 'general';
  estimatedMinutes: number;
  energyLevel: 'Low' | 'Medium' | 'High';
  recommendedSequence: number; // lower number = do earlier
  suggestedSteps: string[];
  mvvReframe: string;
}

export interface PlanStep {
  id: string;
  title: string;
  action: string;
  timeMinutes: number;
  energy: 'Low' | 'Medium' | 'High';
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
}

export interface HumanExecutionPlan {
  markdownText: string;
  phases: PlanStep[];
  suggestedNextStep: string;
}

/**
 * Extracts distinct activities from freeform input
 */
export function extractHumanActivities(input: string): string[] {
  if (!input) return [];

  let text = input
    .replace(/TASK TO PLAN:\s*/gi, '')
    .replace(/Task:\s*/gi, '')
    .replace(/Deadline:\s*[^\n]+/gi, '')
    .replace(/User Energy Level:\s*[^\n]+/gi, '')
    .replace(/Please break this down[^\n]*/gi, '')
    .trim();

  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const results: string[] = [];

  for (const line of lines) {
    const segments = line.split(/(?:,|\band\b|\bplus\b|\bthen\b|&|\/|;|\+)/i);
    for (let seg of segments) {
      seg = seg
        .replace(/^[•*\-\d.)\s]+/, '')
        .replace(/\b(please|can you|help me with|i need to|i have to|want to|trying to)\b/gi, '')
        .trim();
      if (seg.length >= 2) {
        results.push(seg);
      }
    }
  }

  return results.length > 0 ? results : [text];
}

/**
 * Classifies an activity
 */
export function classifyActivity(rawActivity: string): HumanActivity {
  const clean = rawActivity.trim();
  const lower = clean.toLowerCase();

  // 1. Food / Cooking
  if (
    lower.includes('cook') || lower.includes('eat') || lower.includes('food') ||
    lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast') ||
    lower.includes('meal') || lower.includes('snack') || lower.includes('bake') ||
    lower.includes('kitchen') || lower.includes('grocer') || lower.includes('dishes')
  ) {
    return {
      raw: rawActivity,
      cleanName: clean,
      type: 'food',
      estimatedMinutes: 20,
      energyLevel: 'Low',
      recommendedSequence: 1,
      suggestedSteps: [
        'Walk into the kitchen, wash your hands, and decide on a quick 10-15 minute meal (e.g., eggs, sandwich, simple pasta, rice bowl, or reheat leftovers).',
        'Clear one cutting surface or stove burner, get out your ingredients, and cook with calm background music or a podcast playing.',
        'Sit down away from your desk or workspace to eat, drink a tall glass of water, and let your brain recharge with glucose.'
      ],
      mvvReframe: 'If full cooking feels too exhausting, make a 5-minute sandwich, eat fruit and toast, or heat up pre-made food. Nourishment beats perfection.'
    };
  }

  // 2. Hygiene / Bathing
  if (
    lower.includes('bath') || lower.includes('shower') || lower.includes('hygiene') ||
    lower.includes('brush') || lower.includes('wash hair') || lower.includes('skincare') ||
    lower.includes('groom') || lower.includes('clean self') || lower.includes('change clothes')
  ) {
    return {
      raw: rawActivity,
      cleanName: clean,
      type: 'hygiene',
      estimatedMinutes: 20,
      energyLevel: 'Low',
      recommendedSequence: 2,
      suggestedSteps: [
        'Set out a clean towel and comfortable clothes or pajamas *before* turning on the water so there is zero friction when stepping out.',
        'Turn on the shower or bath to a soothing warm temperature. Wash off the sensory residue and physical fatigue of the day.',
        'Dry off, put on clean clothes, and give yourself 5 quiet minutes to let your body feel refreshed and relaxed.'
      ],
      mvvReframe: 'If a full shower feels like a sensory hurdle, do a warm face-wash, change into fresh clothes, and brush your teeth. Lower the physical demand.'
    };
  }

  // 3. Study / Homework
  const countMatch = lower.match(/(\d+)\s*(?:homework|assignments?|papers?|readings?|chapters?|tasks?|questions?|problems?)/i);
  const homeworkCount = countMatch ? parseInt(countMatch[1], 10) : null;

  if (
    homeworkCount || lower.includes('homework') || lower.includes('study') ||
    lower.includes('assignment') || lower.includes('math') || lower.includes('essay') ||
    lower.includes('lecture') || lower.includes('exam') || lower.includes('test prep')
  ) {
    const count = homeworkCount || 1;
    const batch1 = count > 2 ? Math.min(3, count) : count;
    const batch2 = count > batch1 ? count - batch1 : 0;

    const steps = [
      `Clear your immediate desk space, open the assignments, and pick the ${batch1 > 1 ? `${batch1} shortest or most straightforward assignments` : 'first assignment'}.`,
      `Set a 25-minute focus timer. Complete the selected ${batch1 > 1 ? `${batch1} items` : 'item'} without aiming for perfection. Done is better than perfect.`
    ];

    if (batch2 > 0) {
      steps.push(`Take a 5-minute movement or water break. Then tackle the remaining ${batch2} assignments in a second sprint, or schedule them for tomorrow morning.`);
    }

    return {
      raw: rawActivity,
      cleanName: clean,
      type: 'study',
      estimatedMinutes: Math.min(60, count * 15),
      energyLevel: 'Medium',
      recommendedSequence: 3,
      suggestedSteps: steps,
      mvvReframe: count > 2 
        ? `Don't try to force all ${count} homeworks at once. Finishing ${batch1} today preserves your nervous system; schedule the remaining ${batch2} for tomorrow.`
        : 'Aim for a solid B-grade completion. Answer all required questions without endless re-reading or formatting perfectionism.'
    };
  }

  // 4. Chores / Cleaning
  if (
    lower.includes('clean') || lower.includes('laundry') || lower.includes('vacuum') ||
    lower.includes('tidy') || lower.includes('trash') || lower.includes('sweep') || lower.includes('mop')
  ) {
    return {
      raw: rawActivity,
      cleanName: clean,
      type: 'chore',
      estimatedMinutes: 15,
      energyLevel: 'Low',
      recommendedSequence: 4,
      suggestedSteps: [
        `Grab a trash bag or laundry basket and do a rapid 5-minute single-pass sweep for ${clean}.`,
        'Put on engaging background music or an audiobook. Focus only on surfaces at eye level.',
        'Stop when the 15-minute timer rings. Celebrate the visible improvement.'
      ],
      mvvReframe: 'One clean surface gives 80% of the mental peace. Don\'t deep-clean the whole room today.'
    };
  }

  // 5. Work / Coding / Writing
  if (
    lower.includes('code') || lower.includes('program') || lower.includes('email') ||
    lower.includes('report') || lower.includes('meeting') || lower.includes('call') ||
    lower.includes('slide') || lower.includes('presentation')
  ) {
    return {
      raw: rawActivity,
      cleanName: clean,
      type: 'work',
      estimatedMinutes: 30,
      energyLevel: 'Medium',
      recommendedSequence: 3,
      suggestedSteps: [
        `Open only the single document or tool required for "${clean}". Close irrelevant tabs.`,
        'Draft an outline or rough version for 20 minutes without backspacing or self-criticism.',
        'Do a quick 5-minute formatting or review pass, then step away.'
      ],
      mvvReframe: 'A rough draft submitted on time beats a flawless draft stuck in your head.'
    };
  }

  // 6. Default / General
  return {
    raw: rawActivity,
    cleanName: clean,
    type: 'general',
    estimatedMinutes: 20,
    energyLevel: 'Medium',
    recommendedSequence: 3,
    suggestedSteps: [
      `Gather any tools or supplies needed for "${clean}" and clear immediate physical clutter.`,
      `Set a 20-minute countdown timer and make tangible starter progress on "${clean}".`,
      'Review what you accomplished and mark this session complete.'
    ],
    mvvReframe: `Define the smallest visible slice of "${clean}". Completing just that slice builds genuine momentum.`
  };
}

/**
 * Generates human execution plan
 */
export function generateHumanExecutionPlan(
  userPrompt: string,
  userEnergy: string = 'Medium',
  _deadline: string = 'Flexible'
): HumanExecutionPlan {
  const rawActivities = extractHumanActivities(userPrompt);
  const classified = rawActivities.map(classifyActivity);

  classified.sort((a, b) => a.recommendedSequence - b.recommendedSequence);

  const phases: PlanStep[] = [];
  const now = Date.now();

  const studyItem = classified.find(c => c.type === 'study');
  const countMatch = studyItem ? studyItem.raw.toLowerCase().match(/(\d+)\s*(?:homework|assignments?|papers?|problems?)/i) : null;
  const homeworkTotal = countMatch ? parseInt(countMatch[1], 10) : null;

  if (homeworkTotal && homeworkTotal > 2) {
    const nonStudy = classified.filter(c => c.type !== 'study');
    const batch1Count = Math.min(3, homeworkTotal);
    const batch2Count = homeworkTotal - batch1Count;

    for (const item of nonStudy) {
      const stepTitle = item.type === 'food'
        ? `Fuel Up & Kitchen Momentum (${item.cleanName})`
        : item.type === 'hygiene'
        ? `Sensory Reset & Physical Hygiene (${item.cleanName})`
        : item.cleanName;

      phases.push({
        id: `step_${now}_${phases.length + 1}`,
        title: stepTitle,
        action: item.suggestedSteps.join(' '),
        timeMinutes: item.estimatedMinutes,
        energy: item.energyLevel,
        priority: item.type === 'food' || item.type === 'hygiene' ? 'High' : 'Medium',
        completed: false
      });
    }

    phases.push({
      id: `step_${now}_${phases.length + 1}`,
      title: `Homework Batch 1 — Quick Wins (${batch1Count} of ${homeworkTotal} Assignments)`,
      action: `Clear desk, open the ${homeworkTotal} assignments, and pick the ${batch1Count} shortest ones. Set a 25-minute timer and complete them to get instant momentum.`,
      timeMinutes: 25,
      energy: 'Medium',
      priority: 'High',
      completed: false
    });

    phases.push({
      id: `step_${now}_${phases.length + 1}`,
      title: `Homework Batch 2 — Deep Focus (Remaining ${batch2Count} Assignments)`,
      action: `Take a 5-minute water and stretch break. Then tackle the remaining ${batch2Count} assignments in focused 20-minute sprints. Avoid perfectionism.`,
      timeMinutes: 30,
      energy: 'Medium',
      priority: 'Medium',
      completed: false
    });
  } else {
    for (const item of classified) {
      let title = item.cleanName;
      if (item.type === 'food') title = `Fuel Up & Kitchen Momentum (${item.cleanName})`;
      else if (item.type === 'hygiene') title = `Sensory Reset & Physical Care (${item.cleanName})`;
      else if (item.type === 'study') title = `Academic Focus (${item.cleanName})`;
      else if (item.type === 'chore') title = `Home Reset (${item.cleanName})`;

      phases.push({
        id: `step_${now}_${phases.length + 1}`,
        title,
        action: item.suggestedSteps.join(' '),
        timeMinutes: item.estimatedMinutes,
        energy: item.energyLevel,
        priority: item.type === 'food' || item.type === 'hygiene' ? 'High' : 'Medium',
        completed: false
      });
    }
  }

  // Markdown builder
  const phaseListMarkdown = phases.map((p, idx) => {
    return `* **Phase ${idx + 1}: ${p.title}**\n  * **Action:** ${p.action}\n  * **Time:** ${p.timeMinutes} mins\n  * **Energy:** ${p.energy}\n  * **Priority:** ${p.priority}`;
  }).join('\n\n');

  const mvvNotes = classified.map(c => c.mvvReframe).filter(Boolean);
  const primaryMvv = mvvNotes.length > 0 ? mvvNotes[0] : 'Done is better than perfect. Aim for a solid completion rather than perfection.';

  const suggestedNextStep = phases[0] 
    ? (phases[0].title.includes('Fuel') 
        ? 'Walk into the kitchen, drink a full glass of cold water, and pick one simple meal to prepare.'
        : phases[0].title.includes('Sensory')
        ? 'Set out a clean towel and comfortable clothes, then turn on the warm water.'
        : phases[0].action)
    : 'Take 2 deep breaths and do the first 5-minute physical step.';

  const cleanItemsList = classified.map(c => c.cleanName).join(' • ');

  const markdownText = `### 🧩 RICHA Human Execution Plan: ${cleanItemsList}

I analyzed your specific activities (${cleanItemsList}) and sequenced them into realistic, low-friction human phases:

${phaseListMarkdown}

---

**Perfectionism Interrupt (MVV):**
${primaryMvv}

✅ Done this session: Deconstructed ${classified.length} activities (${cleanItemsList}) into human physical steps
🔜 Suggested next step: ${suggestedNextStep}
💾 Saved to: Planner & Task Manager`;

  return {
    markdownText,
    phases,
    suggestedNextStep
  };
}

// FILE: server/src/utils/humanTaskProcessor.js
/**
 * RICHA Human Task Decomposition & Grounding Engine
 * Translates abstract, compound, or everyday user prompts into tangible, physical, human-executable steps.
 * STRICTLY BANS robotic corporate jargon ("primary deliverable", "central deliverable", "tackle deliverable").
 */

/**
 * Normalizes and extracts discrete task phrases from user input.
 * Handles comma-separated lists, 'and', 'then', numbered lists, bullets, and newlines.
 */
export function extractHumanActivities(input) {
  if (!input || typeof input !== 'string') return [];

  const clean = input
    .replace(/\[USER_JOURNAL_DATA_START\]|\[USER_JOURNAL_DATA_END\]/gi, '')
    .replace(/TASK TO PLAN:\s*/i, '')
    .replace(/Task:\s*/i, '')
    .replace(/Deadline:\s*[^\n]*/gi, '')
    .replace(/User Energy Level:\s*[^\n]*/gi, '')
    .trim();

  // Split on newlines, numbered lists, bullets, semicolons
  const rawChunks = clean.split(/(?:\r?\n+|\s*;\s*|^\s*(?:\d+\.|\*|-|•)\s*)/m);
  const items = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.replace(/^(?:\d+\.|\*|-|•)\s*/, '').trim();
    if (!trimmed) continue;

    // Split on commas or " and " if it contains distinct activities
    const subParts = trimmed.split(/,\s*|\s+and\s+(?=[a-z])/i);
    for (const sub of subParts) {
      const s = sub.trim().replace(/^and\s+/i, '').replace(/^[-,.*•]\s*/, '').trim();
      if (s.length > 2) {
        items.push(s);
      }
    }
  }

  // Deduplicate and filter out empty
  const unique = [];
  for (const it of items) {
    if (!unique.some(u => u.toLowerCase() === it.toLowerCase())) {
      unique.push(it);
    }
  }

  return unique.length > 0 ? unique : (clean.length > 2 ? [clean] : []);
}

/**
 * Classifies an activity string into a human life domain and extracts details
 */
export function classifyActivity(activityStr) {
  const lower = activityStr.toLowerCase();

  // 1. Food, Cooking & Nourishment
  if (
    lower.includes('cook') || lower.includes('food') || lower.includes('meal') ||
    lower.includes('dinner') || lower.includes('lunch') || lower.includes('breakfast') ||
    lower.includes('eat') || lower.includes('kitchen') || lower.includes('dishes') ||
    lower.includes('bake') || lower.includes('grocer') || lower.includes('snack')
  ) {
    return {
      type: 'food',
      label: 'Cooking & Nutrition',
      raw: activityStr,
      isBiologicalNeed: true,
      defaultMinutes: 20,
      defaultEnergy: 'Low',
      physicalSteps: [
        'Walk into the kitchen, wash your hands, and decide on a quick 10-15 minute meal (e.g., eggs, sandwich, simple pasta, rice bowl, or reheat leftovers).',
        'Clear one cutting surface or stove burner, get out your ingredients, and cook with calm background music or a podcast playing.',
        'Sit down away from your desk or workspace to eat, drink a tall glass of water, and let your brain recharge with glucose.'
      ],
      mvv: 'If full cooking feels too exhausting, make a 5-minute sandwich, eat fruit and toast, or heat up pre-made food. Nourishment beats perfection.'
    };
  }

  // 2. Bathing, Shower & Sensory Hygiene
  if (
    lower.includes('bath') || lower.includes('shower') || lower.includes('hygiene') ||
    lower.includes('wash') || lower.includes('skincare') || lower.includes('teeth') ||
    lower.includes('groom') || lower.includes('shave') || lower.includes('pajama')
  ) {
    return {
      type: 'hygiene',
      label: 'Bathing & Sensory Reset',
      raw: activityStr,
      isBiologicalNeed: true,
      defaultMinutes: 20,
      defaultEnergy: 'Low',
      physicalSteps: [
        'Set out a clean towel and comfortable clothes or pajamas *before* turning on the water so there is zero friction when stepping out.',
        'Turn on the shower or bath to a soothing warm temperature. Wash off the sensory residue and physical fatigue of the day.',
        'Dry off, put on clean clothes, and give yourself 5 quiet minutes to let your body feel refreshed and relaxed.'
      ],
      mvv: 'If taking a full bath/shower feels overwhelming, wash your face, brush teeth, and change into clean clothes. Any refresh counts.'
    };
  }

  // 3. Homework, Academic, Studying & Schoolwork
  if (
    lower.includes('homework') || lower.includes('study') || lower.includes('assignment') ||
    lower.includes('essay') || lower.includes('paper') || lower.includes('exam') ||
    lower.includes('read') || lower.includes('class') || lower.includes('math') ||
    lower.includes('course') || lower.includes('lecture')
  ) {
    // Extract count if mentioned (e.g., "5 homework", "3 assignments")
    const countMatch = lower.match(/(\d+)\s*(?:homework|assignment|task|paper|problem|essay)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : null;

    let steps = [];
    if (count && count > 1) {
      const half = Math.ceil(count / 2);
      const remaining = count - half;
      steps = [
        `Triage the ${count} assignments on your desk or screen. Sort them from shortest/easiest to longest.`,
        `Batch 1: Set a 25-minute timer and complete the first ${half} easiest assignments to build quick momentum and get dopamine wins.`,
        `Stand up, stretch your shoulders, drink a glass of water, and take a 5-minute screen break.`,
        `Batch 2: Tackle the remaining ${remaining} assignments in focused 20-minute sprints. Stop when the timer chimes.`
      ];
    } else {
      steps = [
        `Clear your desk of unnecessary items, open only the necessary assignment document, and write the title.`,
        `Set a 25-minute focus timer. Draft the first core sections without stopping to edit or critique yourself.`,
        `Take a 5-minute pause to stretch and hydrate, then spend 10 minutes reviewing and submitting your work.`
      ];
    }

    return {
      type: 'study',
      label: count ? `Homework Batching (${count} Assignments)` : `Study & Homework (${activityStr})`,
      raw: activityStr,
      count,
      isBiologicalNeed: false,
      defaultMinutes: count && count > 2 ? 45 : 25,
      defaultEnergy: 'Medium',
      physicalSteps: steps,
      mvv: count && count > 2 
        ? `Aim to complete ${Math.ceil(count * 0.6)} of the ${count} assignments today (the most urgent ones). Park the remaining for tomorrow morning.`
        : 'Aim for a solid 70% complete first draft. A submitted draft is infinitely better than an unfinished masterpiece.'
    };
  }

  // 4. Cleaning, Tidy & Domestic Chores
  if (
    lower.includes('clean') || lower.includes('tidy') || lower.includes('laundry') ||
    lower.includes('room') || lower.includes('trash') || lower.includes('vacuum') ||
    lower.includes('mop') || lower.includes('fold') || lower.includes('organize')
  ) {
    return {
      type: 'chore',
      label: `Home Reset: ${activityStr}`,
      raw: activityStr,
      isBiologicalNeed: false,
      defaultMinutes: 15,
      defaultEnergy: 'Low',
      physicalSteps: [
        'Grab one laundry hamper or one trash bag. Put on comfortable music or a podcast to reduce understimulation.',
        'Do a 15-minute sweep: pick up clothes from floor or clear one single flat surface (like your desk or bed).',
        'Toss obvious wrappers/trash into the bin and step back to enjoy the visual breathing space.'
      ],
      mvv: 'Clear just one surface or put clothes into a single pile. You do not need a spotless room to have a functional sanctuary.'
    };
  }

  // 5. Work, Projects & Email
  if (
    lower.includes('work') || lower.includes('email') || lower.includes('client') ||
    lower.includes('meeting') || lower.includes('presentation') || lower.includes('slide') ||
    lower.includes('sheet') || lower.includes('report') || lower.includes('code') || lower.includes('bug')
  ) {
    return {
      type: 'work',
      label: `Work & Deliverable: ${activityStr}`,
      raw: activityStr,
      isBiologicalNeed: false,
      defaultMinutes: 30,
      defaultEnergy: 'Medium',
      physicalSteps: [
        `Close all unrelated browser tabs and silence notifications for 25 minutes. Open only the tool needed for "${activityStr}".`,
        `Write down the single most urgent sub-section or reply, and focus exclusively on drafting it.`,
        `Review the draft, save progress, and log your next starting action so you can pick it up tomorrow without friction.`
      ],
      mvv: 'Produce the minimum viable draft or reply to the 2 highest-priority emails. Done is better than perfect.'
    };
  }

  // 6. Admin, Financial & Errands
  if (
    lower.includes('bill') || lower.includes('pay') || lower.includes('doctor') ||
    lower.includes('dentist') || lower.includes('bank') || lower.includes('license') ||
    lower.includes('appointment') || lower.includes('errand') || lower.includes('call')
  ) {
    return {
      type: 'admin',
      label: `Life Admin: ${activityStr}`,
      raw: activityStr,
      isBiologicalNeed: false,
      defaultMinutes: 15,
      defaultEnergy: 'Low',
      physicalSteps: [
        `Gather the reference account number, bill, or phone number needed for "${activityStr}".`,
        'Set a 10-minute timer and make the call or submit the payment/form immediately.',
        'Note down confirmation details and set a calendar reminder with a 3-day buffer if follow-up is needed.'
      ],
      mvv: 'Complete just the immediate payment or phone booking. File receipts later.'
    };
  }

  // 7. General Human Activity
  return {
    type: 'general',
    label: activityStr,
    raw: activityStr,
    isBiologicalNeed: false,
    defaultMinutes: 20,
    defaultEnergy: 'Medium',
    physicalSteps: [
      `Set up your physical tools and clear a space specifically for "${activityStr}". Remove any distractions.`,
      `Set a 20-minute timer and work on the very first physical step of "${activityStr}". Stop as soon as the timer chimes.`,
      `Check your progress, save or organize what you completed, and take a restful 5-minute break.`
    ],
    mvv: `Aim for 60-70% completion of "${activityStr}" today to conserve your executive energy.`
  };
}

/**
 * Builds a realistic, human-centered multi-phase execution plan.
 * Respects human biological needs first (eating, bathing), followed by cognitive chunks.
 */
export function generateHumanExecutionPlan(userInput, energyLevel = 'Medium', deadline = 'Flexible') {
  const activities = extractHumanActivities(userInput);
  const classified = activities.map(classifyActivity);

  // Logical human sequencing:
  // 1. Food/Nourishment (brain needs glucose before sustained homework/work!)
  // 2. Bathing/Hygiene (clears sensory fatigue, relaxes the nervous system) OR as wind-down reward
  // 3. Cognitive / Study / Work / Chores (batched into manageable slices)
  
  const foodTasks = classified.filter(c => c.type === 'food');
  const hygieneTasks = classified.filter(c => c.type === 'hygiene');
  const studyTasks = classified.filter(c => c.type === 'study');
  const choreTasks = classified.filter(c => c.type === 'chore');
  const otherTasks = classified.filter(c => !['food', 'hygiene', 'study', 'chore'].includes(c.type));

  const planPhases = [];

  // Phase 1: Nourish / Food (if present)
  if (foodTasks.length > 0) {
    const f = foodTasks[0];
    planPhases.push({
      title: 'Phase 1: Fuel Up & Kitchen Momentum (Cooking & Food)',
      action: f.physicalSteps[0] + ' ' + f.physicalSteps[1] + ' ' + f.physicalSteps[2],
      timeMinutes: 20,
      energy: 'Low',
      priority: 'High',
      mvv: f.mvv,
      startingCue: 'Walk into the kitchen, drink a full glass of cold water, and pick one simple meal to prepare.'
    });
  }

  // Phase 2: Bathing (if user has it, decide if before or after study based on energy)
  // If energy is low or user mentions bathing, taking a warm shower resets cortisol
  if (hygieneTasks.length > 0) {
    const h = hygieneTasks[0];
    const phaseNum = planPhases.length + 1;
    planPhases.push({
      title: `Phase ${phaseNum}: Sensory Reset & Physical Hygiene (Bathing & Shower)`,
      action: h.physicalSteps[0] + ' ' + h.physicalSteps[1] + ' ' + h.physicalSteps[2],
      timeMinutes: 20,
      energy: 'Low',
      priority: 'High',
      mvv: h.mvv,
      startingCue: 'Set out a fresh towel and clean comfortable clothes before turning on the warm water.'
    });
  }

  // Phase 3: Study / Homework / Cognitive Tasks
  if (studyTasks.length > 0) {
    const s = studyTasks[0];
    if (s.count && s.count > 2) {
      const half = Math.ceil(s.count / 2);
      const remaining = s.count - half;
      
      const pNum1 = planPhases.length + 1;
      planPhases.push({
        title: `Phase ${pNum1}: Homework Batch 1 — Quick Wins (${half} of ${s.count} Assignments)`,
        action: `Clear desk, open the ${s.count} assignments, and pick the ${half} shortest ones. Set a 25-minute timer and complete them to get instant momentum.`,
        timeMinutes: 25,
        energy: energyLevel,
        priority: 'High',
        mvv: `Finish just ${half} assignments today. Getting some done is infinitely better than freezing.`,
        startingCue: 'Lay out the assignments and pick the single shortest one to start with.'
      });

      const pNum2 = planPhases.length + 1;
      planPhases.push({
        title: `Phase ${pNum2}: Homework Batch 2 — Deep Focus (Remaining ${remaining} Assignments)`,
        action: `Take a 5-minute water and stretch break. Then tackle the remaining ${remaining} assignments in focused 20-minute sprints. Avoid perfectionism.`,
        timeMinutes: 30,
        energy: energyLevel,
        priority: 'Medium',
        mvv: `Aim for 70% solid completion on the remaining assignments.`,
        startingCue: 'Stand up, stretch for 2 minutes, then start the next assignment timer.'
      });
    } else {
      const pNum = planPhases.length + 1;
      planPhases.push({
        title: `Phase ${pNum}: Focused Study Block (${s.label})`,
        action: s.physicalSteps.join(' '),
        timeMinutes: 25,
        energy: energyLevel,
        priority: 'High',
        mvv: s.mvv,
        startingCue: 'Clear clutter off your desk, open the assignment, and write the title.'
      });
    }
  }

  // Chores & Other
  for (const item of [...choreTasks, ...otherTasks]) {
    if (planPhases.length >= 4) break; // Keep plan within 3-4 phases max to prevent cognitive flooding
    const pNum = planPhases.length + 1;
    planPhases.push({
      title: `Phase ${pNum}: ${item.label}`,
      action: item.physicalSteps.join(' '),
      timeMinutes: item.defaultMinutes,
      energy: item.defaultEnergy,
      priority: 'Medium',
      mvv: item.mvv,
      startingCue: item.physicalSteps[0]
    });
  }

  // If no classified categories matched or only 1 item provided
  if (planPhases.length === 0) {
    const single = classified[0] || classifyActivity(userInput);
    planPhases.push(
      {
        title: `Phase 1: Setup & Low-Friction Entry for "${single.raw}"`,
        action: single.physicalSteps[0],
        timeMinutes: 15,
        energy: 'Low',
        priority: 'High',
        mvv: single.mvv,
        startingCue: single.physicalSteps[0]
      },
      {
        title: `Phase 2: Core Focus on "${single.raw}"`,
        action: single.physicalSteps[1] || `Work in a 25-minute focused interval on "${single.raw}".`,
        timeMinutes: 25,
        energy: energyLevel,
        priority: 'High',
        mvv: single.mvv,
        startingCue: `Set a 25-minute timer and start the main part of "${single.raw}".`
      },
      {
        title: `Phase 3: Wrap-Up & Rest for "${single.raw}"`,
        action: single.physicalSteps[2] || `Review work on "${single.raw}", organize notes, and step away to rest.`,
        timeMinutes: 15,
        energy: 'Low',
        priority: 'Medium',
        mvv: single.mvv,
        startingCue: 'Save your work, tidy tools, and take a 10-minute break.'
      }
    );
  }

  // Generate markdown output
  const phasesMarkdown = planPhases.map((phase) => `* **${phase.title}**
  * **Action:** ${phase.action}
  * **Time:** ${phase.timeMinutes} mins
  * **Energy:** ${phase.energy}
  * **Priority:** ${phase.priority}`).join('\n\n');

  const primaryTask = activities[0] || userInput;
  const firstStartingCue = planPhases[0]?.startingCue || `Take 2 slow deep breaths and start Phase 1.`;
  const overallMVV = planPhases.map(p => p.mvv).filter(Boolean)[0] || 'Done is better than perfect. Aim for 70% completion today.';

  const markdownText = `### 🧩 RICHA Human Execution Plan: ${activities.join(' • ')}

I analyzed your specific activities (${activities.join(', ')}) and sequenced them into realistic, low-friction human phases:

${phasesMarkdown}

---

**Perfectionism Interrupt (MVV):**
${overallMVV}

✅ Done this session: Deconstructed ${activities.length > 1 ? `${activities.length} activities (${activities.join(', ')})` : `"${primaryTask}"`} into human physical steps
🔜 Suggested next step: ${firstStartingCue}
💾 Saved to: Planner & Task Manager`;

  return {
    markdownText,
    phases: planPhases.map((p, idx) => ({
      id: `step_${Date.now()}_${idx + 1}`,
      title: p.title.replace(/^Phase\s*\d+:?\s*/i, '').trim(),
      action: p.action,
      timeMinutes: p.timeMinutes,
      energy: p.energy,
      priority: p.priority,
      completed: false
    })),
    suggestedNextStep: firstStartingCue
  };
}

/**
 * Generates human 4D Prioritization (Delete, Delay, Diminish, Delegate)
 * Ensures biological needs (cooking/eating, bathing) are never "Deleted", but Diminished.
 */
export function generateHuman4DPrioritization(userInput) {
  const activities = extractHumanActivities(userInput);
  const classified = activities.map(classifyActivity);

  let deleteItems = [];
  let delayItems = [];
  let diminishItems = [];
  let delegateItems = [];

  for (const item of classified) {
    if (item.type === 'food') {
      diminishItems.push(`🍲 **Cooking / Food (${item.raw})**: Keep it ultra-simple. Cook a 10-15 minute meal (e.g. eggs, sandwich, or microwave leftovers) rather than an elaborate recipe. Eating fuels your brain.`);
    } else if (item.type === 'hygiene') {
      diminishItems.push(`🚿 **Bathing / Shower (${item.raw})**: Non-negotiable sensory reset. Take a soothing 15-minute warm shower to wash away fatigue. If exhausted, wash face and put on fresh clothes.`);
    } else if (item.type === 'study') {
      if (item.count && item.count > 2) {
        diminishItems.push(`📚 **Homework Batch 1 (${Math.ceil(item.count / 2)} assignments)**: Complete only the ${Math.ceil(item.count / 2)} most urgent/shortest assignments today (Minimum Viable Version).`);
        delayItems.push(`⏰ **Homework Batch 2 (${item.count - Math.ceil(item.count / 2)} assignments)**: Schedule the remaining ${item.count - Math.ceil(item.count / 2)} assignments for tomorrow morning when cognitive focus is recharged.`);
      } else {
        diminishItems.push(`📚 **Homework / Study (${item.raw})**: Set a 25-minute Pomodoro timer. Aim to finish a 70% solid first draft rather than polishing it to perfection.`);
      }
    } else if (item.type === 'chore') {
      diminishItems.push(`🧹 **Chore (${item.raw})**: Do a 10-minute speed tidy or clear just one surface.`);
      delayItems.push(`⏰ **Deep Cleaning (${item.raw})**: Delay full deep scrubbing until the weekend.`);
    } else if (item.type === 'admin') {
      diminishItems.push(`📋 **Admin (${item.raw})**: Pay the bill or send the urgent text now; file receipts later.`);
    } else {
      if (diminishItems.length < 2) {
        diminishItems.push(`✂️ **Diminish**: "${item.raw}" — Strip this to its 15-minute minimum viable slice.`);
      } else {
        delayItems.push(`⏰ **Delay**: "${item.raw}" — Park safely for tomorrow to reduce active working memory clutter.`);
      }
    }
  }

  // Delete category: Always realistic psychological relief
  deleteItems.push(`🗑️ **Delete without guilt**: The unrealistic expectation that you must do all of this perfectly in a single exhausting marathon.`);
  if (classified.some(c => c.type === 'study')) {
    deleteItems.push(`🗑️ **Delete**: Compulsive re-reading and endless perfectionist formatting on assignments.`);
  }

  // Delegate / Automate
  if (classified.some(c => c.type === 'food')) {
    delegateItems.push(`👥 **Delegate/Automate**: If cooking is completely out of reach today, order takeout or ask a family member/partner to share food.`);
  } else {
    delegateItems.push(`👥 **Delegate/Automate**: Look for templates, reference notes, or ask a peer for clarification on tricky steps.`);
  }

  const text = `### 🎯 Julie Morgenstern 4D Prioritization Matrix

Here is your tailored 4D triage breakdown working directly on your list (${activities.join(', ')}):

* ✂️ **DIMINISH (Minimum Viable Version - Do These First):**
${diminishItems.map(i => `  * ${i}`).join('\n')}

* ⏰ **DELAY (Schedule for later without guilt):**
${delayItems.map(i => `  * ${i}`).join('\n')}

* 🗑️ **DELETE (Eliminate perfectionism & arbitrary pressure):**
${deleteItems.map(i => `  * ${i}`).join('\n')}

* 👥 **DELEGATE / AUTOMATE:**
${delegateItems.map(i => `  * ${i}`).join('\n')}

---

✅ Done this session: Applied 4D neurodivergent triage across your specific tasks (${activities.join(', ')})
🔜 Suggested next step: Start the first DIMINISHED item (${diminishItems[0] ? diminishItems[0].split(':')[0].replace(/^[^\w]*/, '') : 'top priority'})
💾 Saved to: 4D Priority Matrix`;

  return { text };
}

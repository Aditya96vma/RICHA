// FILE: src/data/demoShowcaseData.ts
// Demo Mode Showcase Dataset: Rich, realistic examples across all 7 agents and the Bento Hub

export interface DemoFeatureExample {
  title: string;
  agentBadge: string;
  tagline: string;
  description: string;
  highlightInsight: string;
  data: any;
}

export const DEMO_SHOWCASE_DATA = {
  planner: {
    title: 'Agent 1: Micro-Step Planner',
    agentBadge: 'Agent 1 • Executive Slicing',
    tagline: 'Defeating Task Paralysis Through Atomic 15-Minute Actions',
    description: 'When facing a high-dread obligation, the Planner dismantles overwhelming projects into dopamine-friendly, ultra-low resistance micro-steps.',
    highlightInsight: 'Identified avoidance loop on "Tax & Invoicing". Sliced into 4 atomic steps with a gentle 15-min dopamine timer.',
    sampleTaskInput: 'Submit Quarterly Self-Employment Invoices and Reconcile Healthcare Receipts',
    samplePlanSteps: [
      {
        id: 'step-1',
        title: 'Gather invoices & open billing portal',
        detail: 'Log into your invoicing dashboard and open the 3 unpaid draft client contracts. Do not calculate totals yet.',
        estimatedMinutes: 10,
        energyLevel: 'low',
        completed: true
      },
      {
        id: 'step-2',
        title: 'Verify hours worked against Google Calendar',
        detail: 'Cross-check the 4 major sprint milestones logged in your calendar notes from July-August.',
        estimatedMinutes: 15,
        energyLevel: 'medium',
        completed: true
      },
      {
        id: 'step-3',
        title: 'Generate PDF summaries and hit Send',
        detail: 'Click "Batch Send" with standard thank-you template. Put phone on "Do Not Disturb" for 5 minutes.',
        estimatedMinutes: 12,
        energyLevel: 'low',
        completed: false
      },
      {
        id: 'step-4',
        title: 'File PDF receipts into Cloud folder',
        detail: 'Drag downloaded receipts into 2026/Q3 Expenses folder. Give yourself a 10-minute break with hydration.',
        estimatedMinutes: 8,
        energyLevel: 'low',
        completed: false
      }
    ],
    sampleSuggestedNext: 'Generate PDF summaries and hit Send (Estimated: 12 mins)',
    sampleRawPlan: `### 🎯 Human Executive Slicing
**Task**: Submit Quarterly Invoices & Reconcile Receipts
**Cognitive Friction**: High financial dread + fear of paperwork errors
**Resolution Strategy**: Low-energy sequencing with atomic checkboxes

1. [x] **Step 1: Gather invoices & open billing portal** (10 min | Low Energy)
2. [x] **Step 2: Verify hours against Google Calendar** (15 min | Medium Energy)
3. [ ] **Step 3: Generate PDF summaries & hit Send** (12 min | Low Energy) — *Current Active Focus*
4. [ ] **Step 4: File PDF receipts into Cloud folder** (8 min | Low Energy)`
  },

  prioritizer: {
    title: 'Agent 2: 4D Priority Triage',
    agentBadge: 'Agent 2 • Cognitive Load Shield',
    tagline: 'Triage without decision fatigue using the Do, Defer, Delegate, Drop matrix',
    description: 'Evaluates dopamine cost, urgency, and true emotional importance to protect you from hyperfocusing on non-essential trivia.',
    highlightInsight: 'Detected 2 tasks disguised as "urgent" that actually belong in the Drop quadrant to save executive energy.',
    sampleItems: [
      {
        id: '4d-1',
        title: 'Deploy Hotfix for Client API Timeout',
        quadrant: 'do',
        dopamineScore: 4,
        urgency: 'high',
        importance: 'high',
        reasoning: 'Direct blocker with real client impact. High dopamine payout upon resolution.'
      },
      {
        id: '4d-2',
        title: 'Refactor Legacy CSS Utility Classes',
        quadrant: 'defer',
        dopamineScore: 2,
        urgency: 'low',
        importance: 'medium',
        reasoning: 'Satisfying perfectionism trap. Move to next week cooldown sprint.'
      },
      {
        id: '4d-3',
        title: 'Schedule Annual Dental & Eye Exam Checkups',
        quadrant: 'delegate',
        dopamineScore: 1,
        urgency: 'medium',
        importance: 'high',
        reasoning: 'High cognitive friction. Use automated online booking link or ask partner to co-schedule.'
      },
      {
        id: '4d-4',
        title: 'Organize 800+ Unsorted Browser Bookmarks',
        quadrant: 'drop',
        dopamineScore: 1,
        urgency: 'none',
        importance: 'low',
        reasoning: 'Classic procrastination pseudo-task. Safely drop without guilt or remorse.'
      }
    ]
  },

  admin: {
    title: 'Agent 3: Life Admin Engine',
    agentBadge: 'Agent 3 • Bureaucracy Defense',
    tagline: 'Automating and buffering administrative obligations before they trigger panic',
    description: 'Tracks renewals, paperwork, prescriptions, and official filings with built-in emotional buffers.',
    highlightInsight: 'Passport expires in 90 days. Pre-compiled the photo checklist and renewal link.',
    sampleObligations: [
      {
        id: 'admin-1',
        title: 'Passport Renewal Submission',
        category: 'Legal / Identity',
        dueDate: 'In 3 Weeks',
        status: 'In Progress',
        notes: 'Photo taken. Just need to print application form and mail envelope.'
      },
      {
        id: 'admin-2',
        title: 'Quarterly Cloud Server Budget Review',
        category: 'Finance',
        dueDate: 'Friday',
        status: 'Pending',
        notes: 'Cancel 2 unused staging subscriptions saving $48/mo.'
      },
      {
        id: 'admin-3',
        title: 'Refill Chronic Prescription',
        category: 'Health',
        dueDate: 'Next Monday',
        status: 'Scheduled',
        notes: 'Pharmacy auto-text reminder configured.'
      }
    ]
  },

  wellbeing: {
    title: 'Agent 4: Sensory Shield & Wellbeing',
    agentBadge: 'Agent 4 • Sensory Sanctuary',
    tagline: 'Neurodivergent nervous system regulation and sensory overwhelm prevention',
    description: 'Instantly silences notifications, lowers visual contrast, and provides somatic 4-7-8 breathing anchors.',
    highlightInsight: 'Sensory shield engaged: 43 minutes of quiet executive bandwidth preserved today.',
    sampleSensoryState: {
      shieldActive: true,
      currentEnergy: 68,
      soundscape: 'Binaural Theta / Soft Rain',
      affirmation: 'You do not have to finish everything today. Consistency beats intensity every single time.',
      breathingCadence: '4s Inhale • 7s Hold • 8s Exhale'
    }
  },

  journal: {
    title: 'Agent 5: Intelligent Journal & Socratic AI',
    agentBadge: 'Agent 5 • Cognitive Mirror',
    tagline: 'Socratic dialogue that reframes perfectionism and detects hidden behavioral patterns',
    description: 'Not a generic chatbot—a specialized psychological reflector that spots cognitive distortions and celebrates small wins.',
    highlightInsight: 'Identified cognitive reframing: Converted "I accomplished nothing today" into recognition of 3 essential systemic tasks.',
    sampleMessages: [
      {
        id: 'demo-msg-1',
        sender: 'user',
        text: 'I felt so scattered today. I started three different design mockups and didn\'t submit the final deck. Feeling like I wasted the whole afternoon.',
        timestamp: '14:32'
      },
      {
        id: 'demo-msg-2',
        sender: 'assistant',
        text: 'Let\'s pause and examine that thought with compassion. Notice how your mind immediately labeled the entire afternoon "wasted" because the final deck wasn\'t delivered.\n\nYou explored three architectural solutions, which narrowed down the exact UX bottleneck you were stuck on yesterday. That is iterative design, not wasted time.\n\nWhat is the very smallest next step on that deck—perhaps just exporting slide 1—that takes under 4 minutes?',
        timestamp: '14:33',
        reframingTag: 'All-or-Nothing Reframing'
      },
      {
        id: 'demo-msg-3',
        sender: 'user',
        text: 'That actually helps a lot. I can just export slide 1 now and send the preview link.',
        timestamp: '14:35'
      }
    ]
  },

  kanban: {
    title: 'Agent 6: Cognitive Kanban Board',
    agentBadge: 'Agent 6 • WIP Protection',
    tagline: 'Visualizing work with rigid Work-In-Progress (WIP) constraints and capacity overrides',
    description: 'Enforces realistic cognitive boundaries so you never drown under 15 half-started projects.',
    highlightInsight: 'WIP Limit Active: Capped at maximum 3 simultaneous tasks in "In Progress" to preserve focus.',
    sampleCards: [
      {
        id: 'k-1',
        title: 'Review Q3 Engineering Roadmap',
        column: 'backlog',
        domain: 'work',
        priority: 'medium',
        energy: 'high'
      },
      {
        id: 'k-2',
        title: 'Draft Client Architecture Spec',
        column: 'in_progress',
        domain: 'work',
        priority: 'high',
        energy: 'medium'
      },
      {
        id: 'k-3',
        title: 'Order HEPA Air Filter Replacement',
        column: 'this_week',
        domain: 'health',
        priority: 'low',
        energy: 'low'
      },
      {
        id: 'k-4',
        title: 'Submitted Q2 Tax Paperwork',
        column: 'done',
        domain: 'admin',
        priority: 'high',
        energy: 'medium'
      }
    ]
  },

  braindump: {
    title: 'Agent 7: Bullet Log & Rapid Triage',
    agentBadge: 'Agent 7 • Mental Offloading',
    tagline: 'High-speed capture for racing ADHD thoughts into clean semantic buckets',
    description: 'Dump everything in your head without formatting; the agent extracts tasks, notes, ideas, and noise.',
    highlightInsight: 'Converted 9 rambling thoughts into 3 actionable cards, 2 calendar events, and discarded 4 intrusive worries.',
    sampleBullets: [
      { id: 'b-1', text: 'Call car insurance about safe driver discount', type: 'task', completed: false },
      { id: 'b-2', text: 'Idea: Build sensory soundscape toggle in the mobile app header', type: 'idea', completed: false },
      { id: 'b-3', text: 'Energy drops around 3pm if I skip protein at lunch', type: 'reflection', completed: true },
      { id: 'b-4', text: 'Remember to pick up cold brew beans before Friday sprint', type: 'task', completed: true }
    ]
  },

  habits: {
    title: 'Executive Habit Engine',
    agentBadge: 'Agent 6 • Low-Demand Routines',
    tagline: 'Streak tracking designed with grace and 2-minute fallback routines',
    description: 'When energy is low, habit tracking should adapt rather than shame.',
    highlightInsight: '4-day streak on Morning Hydration. Low-demand alternate active for Yoga.',
    sampleHabits: [
      { id: 'h-1', name: 'Morning Sunlight & Hydration', streak: 6, frequency: 'daily', domain: 'health' },
      { id: 'h-2', name: '10-Minute Desk Clear & Reset', streak: 4, frequency: 'daily', domain: 'self' },
      { id: 'h-3', name: 'Zero-Notification Focus Block', streak: 3, frequency: 'daily', domain: 'work' },
      { id: 'h-4', name: 'Sensory Dimming at 9:30 PM', streak: 8, frequency: 'daily', domain: 'health' }
    ]
  }
};

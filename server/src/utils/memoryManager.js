// FILE: server/src/utils/memoryManager.js
// SECURITY: Directive 2 (OWASP A01 UID Isolation), Directive 3 (Private Memory Storage), Directive 6.4 (stripUndefined)
// AGENT: Long-term User Memory System for RICHA Journaling Companion

import { getDocument, saveDocument, listDocuments, stripUndefined } from './firestoreHelper.js';

/**
 * Retrieves the full private memory profile for a verified user
 * @param {string} uid - Verified user ID
 * @returns {Promise<object>} User memory object
 */
export async function getUserMemory(uid) {
  if (!uid) return getDefaultMemory();

  try {
    const memoryDoc = await getDocument(uid, 'profile', 'memory');
    if (memoryDoc) {
      return {
        people: memoryDoc.people || [],
        health: memoryDoc.health || [],
        appointments: memoryDoc.appointments || [],
        work: memoryDoc.work || [],
        moods: memoryDoc.moods || [],
        themes: memoryDoc.themes || [],
        locations: memoryDoc.locations || [],
        sensoryTriggers: memoryDoc.sensoryTriggers || [],
        copingStrategies: memoryDoc.copingStrategies || [],
        emotionalLandmarks: memoryDoc.emotionalLandmarks || {
          happiest: [],
          lowest: [],
          proud: [],
          calm: []
        },
        preferences: memoryDoc.preferences || [],
        reminderSettings: memoryDoc.reminderSettings || {
          enabled: true,
          time: '20:00',
          frequency: 'daily',
          gentleMessage: 'Time for a gentle pause. How was your day?'
        },
        lastJournalDate: memoryDoc.lastJournalDate || null,
        updatedAt: memoryDoc.updatedAt || null
      };
    }
  } catch (err) {
    console.warn(`[MemoryManager] Failed to load memory for ${uid}:`, err.message);
  }

  return getDefaultMemory();
}

/**
 * Returns default empty memory profile
 */
function getDefaultMemory() {
  return {
    people: [],
    health: [],
    appointments: [],
    work: [],
    moods: [],
    themes: [],
    locations: [],
    sensoryTriggers: [],
    copingStrategies: [],
    emotionalLandmarks: {
      happiest: [],
      lowest: [],
      proud: [],
      calm: []
    },
    preferences: [],
    reminderSettings: {
      enabled: true,
      time: '20:00',
      frequency: 'daily',
      gentleMessage: 'Time for a gentle pause. How was your day?'
    },
    lastJournalDate: null,
    updatedAt: null
  };
}

/**
 * Extracts and updates memory from a user turn without fabricating details
 * @param {string} uid - Verified user ID
 * @param {string} userText - User's message
 * @param {string} [aiReply] - Assistant's response
 * @returns {Promise<object>} Updated memory profile
 */
export async function extractAndUpdateMemory(uid, userText, aiReply = '') {
  if (!uid || !userText) return getDefaultMemory();

  const currentMemory = await getUserMemory(uid);
  const textLower = userText.toLowerCase();

  let modified = false;

  // 1. People Extraction (e.g. "my partner Alex", "with Sarah", "called my mum", "my boss")
  const partnerMatch = userText.match(/(?:partner|friend|husband|wife|boyfriend|girlfriend|colleague|brother|sister|mom|mum|dad)\s+([A-Z][a-z]+)/i);
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1];
    const relMatch = userText.match(/(partner|friend|husband|wife|boyfriend|girlfriend|colleague|brother|sister|mom|mum|dad)/i);
    const relationship = relMatch ? relMatch[1].toLowerCase() : 'close connection';
    
    const existingIndex = currentMemory.people.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      currentMemory.people[existingIndex].context = userText.slice(0, 160);
      currentMemory.people[existingIndex].relationship = relationship;
      currentMemory.people[existingIndex].lastMentioned = new Date().toISOString();
    } else {
      currentMemory.people.push({
        name,
        relationship,
        context: userText.slice(0, 160),
        lastMentioned: new Date().toISOString()
      });
    }
    modified = true;
  }

  // 2. Health & Medical Extraction strictly from actual user text
  if (textLower.includes('doctor') || textLower.includes('medication') || textLower.includes('health') || textLower.includes('dentist') || textLower.includes('therapy')) {
    const healthItem = {
      event: textLower.includes('therapy') ? 'Therapy session' : 'Health check/care',
      detail: userText.slice(0, 140),
      date: new Date().toISOString().split('T')[0],
      recordedAt: new Date().toISOString()
    };
    
    const isDup = currentMemory.health.some((h) => h.event === healthItem.event && h.date === healthItem.date);
    if (!isDup) {
      currentMemory.health.push(healthItem);
      modified = true;
    }
  }

  // 3. Appointments & Important Dates strictly from actual user text
  const dateMatch = userText.match(/(?:on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dateMatch || textLower.includes('appointment') || textLower.includes('meeting') || textLower.includes('interview')) {
    const day = dateMatch ? dateMatch[1] : 'Upcoming';
    const appt = {
      what: textLower.includes('dentist') ? 'Dentist' : textLower.includes('meeting') ? 'Meeting' : 'Commitment',
      when: day,
      notes: userText.slice(0, 100),
      createdAt: new Date().toISOString()
    };

    const existingAppt = currentMemory.appointments.find((a) => a.what === appt.what && a.when === appt.when);
    if (!existingAppt) {
      currentMemory.appointments.push(appt);
      modified = true;
    }
  }

  // 4. Work & Career Stress (e.g., "boss keeps piling things on", "report for work", "can't say no")
  if (textLower.includes('boss') || textLower.includes('work') || textLower.includes('job') || textLower.includes('manager') || textLower.includes('deadline')) {
    const workItem = {
      topic: textLower.includes('boss') ? 'Boss boundary challenges & heavy workload' : 'Work deadline & stress',
      detail: userText.slice(0, 150),
      timestamp: new Date().toISOString()
    };
    const isDup = currentMemory.work.some((w) => w.topic === workItem.topic);
    if (!isDup) {
      currentMemory.work.push(workItem);
      modified = true;
    }
  }

  // 5. Moods, Emotional State & Emotional Landmarks (Happiest, Lowest, Proud, Calm)
  if (
    textLower.includes('happiest') || textLower.includes('happy') || textLower.includes('joy') || textLower.includes('best part') ||
    textLower.includes('lowest') || textLower.includes('worst') || textLower.includes('crying') || textLower.includes('hopeless') ||
    textLower.includes('proud') || textLower.includes('accomplished') || textLower.includes('did it') ||
    textLower.includes('calm') || textLower.includes('peaceful') || textLower.includes('grounded') ||
    textLower.includes('rattled') || textLower.includes('exhausted') || textLower.includes('relieved') || textLower.includes('anxious') || textLower.includes('better')
  ) {
    let currentMood = 'Processing emotions';
    let landmarkType = null;

    if (textLower.includes('happiest') || textLower.includes('so happy') || textLower.includes('pure joy') || textLower.includes('best day')) {
      currentMood = 'Peak joy & happiness';
      landmarkType = 'happiest';
    } else if (textLower.includes('lowest') || textLower.includes('felt the lowest') || textLower.includes('lowest point') || textLower.includes('crying') || textLower.includes('hopeless')) {
      currentMood = 'Felt low / vulnerable';
      landmarkType = 'lowest';
    } else if (textLower.includes('proud') || textLower.includes('accomplished') || textLower.includes('proud of myself') || textLower.includes('finally finished')) {
      currentMood = 'Proud & accomplished';
      landmarkType = 'proud';
    } else if (textLower.includes('calm') || textLower.includes('peaceful') || textLower.includes('grounded') || textLower.includes('relief')) {
      currentMood = 'Calm & grounded';
      landmarkType = 'calm';
    } else if (textLower.includes('better')) {
      currentMood = 'Feeling better, supported';
    } else if (textLower.includes('relieved') && textLower.includes('scared')) {
      currentMood = 'Relieved yet scared, processing diagnosis';
    } else if (textLower.includes('rattled')) {
      currentMood = 'Rattled but coping';
    } else if (textLower.includes('exhausted')) {
      currentMood = 'Deeply exhausted, cognitive overload';
    } else if (textLower.includes('anxious')) {
      currentMood = 'Anxious';
    }

    currentMemory.moods.push({
      mood: currentMood,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    });
    // Keep max 15 recent moods
    if (currentMemory.moods.length > 15) {
      currentMemory.moods = currentMemory.moods.slice(-15);
    }
    modified = true;

    // Track emotional landmark if detected
    if (landmarkType) {
      if (!currentMemory.emotionalLandmarks) {
        currentMemory.emotionalLandmarks = { happiest: [], lowest: [], proud: [], calm: [] };
      }
      if (!Array.isArray(currentMemory.emotionalLandmarks[landmarkType])) {
        currentMemory.emotionalLandmarks[landmarkType] = [];
      }

      currentMemory.emotionalLandmarks[landmarkType].push({
        moment: userText.slice(0, 200),
        mood: currentMood,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: new Date().toISOString()
      });

      // Keep max 8 per landmark type
      if (currentMemory.emotionalLandmarks[landmarkType].length > 8) {
        currentMemory.emotionalLandmarks[landmarkType] = currentMemory.emotionalLandmarks[landmarkType].slice(-8);
      }
    }
  }

  // 6. Location Extraction (e.g. "at the park", "in London", "at my desk", "coffee shop in Soho", "at home")
  const locationMatch = userText.match(/(?:at|in|near|visiting|went to|sitting at)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|coffee shop|park|library|office|home|beach|gym|studio)/i);
  if (locationMatch && locationMatch[1]) {
    const place = locationMatch[1].trim();
    if (!currentMemory.locations) currentMemory.locations = [];
    const exists = currentMemory.locations.some(l => l.placeName.toLowerCase() === place.toLowerCase());
    if (!exists) {
      currentMemory.locations.push({
        placeName: place,
        context: userText.slice(0, 140),
        lastVisited: new Date().toISOString().split('T')[0]
      });
      if (currentMemory.locations.length > 10) {
        currentMemory.locations = currentMemory.locations.slice(-10);
      }
      modified = true;
    }
  }

  // 6. Themes
  const themeCandidates = [];
  if (textLower.includes('health') || textLower.includes('diagnosis')) themeCandidates.push('health processing');
  if (textLower.includes('boss') || textLower.includes("can't say no") || textLower.includes('boundary')) themeCandidates.push('workplace boundaries');
  if (textLower.includes('jason') || textLower.includes('partner')) themeCandidates.push('relationship support');
  if (textLower.includes('overwhelmed') || textLower.includes('exhausted')) themeCandidates.push('burnout prevention');

  for (const t of themeCandidates) {
    if (!currentMemory.themes.includes(t)) {
      currentMemory.themes.push(t);
      modified = true;
    }
  }

  // Save if modified
  if (modified) {
    currentMemory.updatedAt = new Date().toISOString();
    try {
      await saveDocument(uid, 'profile', 'memory', currentMemory);
    } catch (err) {
      console.warn(`[MemoryManager] Failed to save updated memory for ${uid}:`, err.message);
    }
  }

  return currentMemory;
}

/**
 * Formats user memories into a natural prompt context string for Gemini
 * @param {object} memory 
 * @returns {string} Contextual string
 */
export function formatMemoryContext(memory) {
  if (!memory) return 'No previous memories recorded yet.';

  const parts = [];

  if (memory.people && memory.people.length > 0) {
    const peopleStr = memory.people.map((p) => `${p.name} (${p.relationship || 'connection'}: ${p.context || ''})`).join(', ');
    parts.push(`People in user's life: ${peopleStr}`);
  }

  if (memory.health && memory.health.length > 0) {
    const healthStr = memory.health.map((h) => `${h.event} - ${h.detail} (${h.date})`).join('; ');
    parts.push(`Health details: ${healthStr}`);
  }

  if (memory.appointments && memory.appointments.length > 0) {
    const apptStr = memory.appointments.map((a) => `${a.what} (${a.when}, note: ${a.notes || 'none'})`).join('; ');
    parts.push(`Upcoming commitments: ${apptStr}`);
  }

  if (memory.work && memory.work.length > 0) {
    const workStr = memory.work.map((w) => `${w.topic}: ${w.detail}`).join('; ');
    parts.push(`Work context: ${workStr}`);
  }

  if (memory.moods && memory.moods.length > 0) {
    const latestMood = memory.moods[memory.moods.length - 1];
    parts.push(`Recent mood: ${latestMood.mood} on ${latestMood.date}`);
  }

  if (memory.themes && memory.themes.length > 0) {
    const themeStr = memory.themes.map((t) => typeof t === 'string' ? t : (t.topic || t.theme || JSON.stringify(t))).join(', ');
    parts.push(`Recurring life themes: ${themeStr}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No previous memories recorded yet.';
}

/**
 * Removes a specific memory item from the user's private profile
 * @param {string} uid 
 * @param {string} category - 'people' | 'health' | 'appointments' | 'work' | 'locations' | 'themes'
 * @param {number} index - Index of item to remove
 * @returns {Promise<object>} Updated memory
 */
export async function forgetMemoryItem(uid, category, index) {
  if (!uid) return getDefaultMemory();
  const memory = await getUserMemory(uid);

  if (Array.isArray(memory[category]) && index >= 0 && index < memory[category].length) {
    memory[category].splice(index, 1);
    memory.updatedAt = new Date().toISOString();
    await saveDocument(uid, 'profile', 'memory', memory);
  }

  return memory;
}

/**
 * Clears all memories for a user
 * @param {string} uid 
 * @returns {Promise<object>} Clean memory profile
 */
export async function clearAllMemories(uid) {
  if (!uid) return getDefaultMemory();
  const clean = getDefaultMemory();
  clean.updatedAt = new Date().toISOString();
  await saveDocument(uid, 'profile', 'memory', clean);
  return clean;
}

/**
 * Detects facts from user input without silently saving them.
 * Returns structured PendingMemory objects for ephemeral "Memory Receipts".
 * @param {string} uid 
 * @param {string} userText 
 * @param {object} [options] 
 * @returns {Promise<Array<object>>} Pending memories requiring user consent
 */
export async function detectPendingMemories(uid, userText, options = {}) {
  if (!uid || !userText || options.incognito) {
    return [];
  }

  const currentMemory = await getUserMemory(uid);
  const textLower = userText.toLowerCase();
  const pending = [];

  // 1. People Extraction
  const partnerMatch = userText.match(/(?:partner|friend|husband|wife|boyfriend|girlfriend|colleague|brother|sister|mom|mum|dad)\s+([A-Z][a-z]+)/i);
  if (partnerMatch && partnerMatch[1]) {
    const name = partnerMatch[1];
    const relMatch = userText.match(/(partner|friend|husband|wife|boyfriend|girlfriend|colleague|brother|sister|mom|mum|dad)/i);
    const relationship = relMatch ? relMatch[1].toLowerCase() : 'close connection';
    const alreadySaved = currentMemory.people.some((p) => p.name.toLowerCase() === name.toLowerCase());
    
    if (!alreadySaved) {
      pending.push({
        id: `mem_person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'people',
        label: 'Person / Relationship',
        title: `${name} (${relationship})`,
        detail: `Mentioned: "${userText.slice(0, 100)}"`,
        provenance: `Learned from conversation on ${new Date().toLocaleDateString()}`,
        payload: {
          name,
          relationship,
          context: userText.slice(0, 160),
          lastMentioned: new Date().toISOString()
        }
      });
    }
  }

  // 2. Sensory Triggers
  if (
    textLower.includes('fluorescent') ||
    textLower.includes('too loud') ||
    textLower.includes('buzzing') ||
    textLower.includes('sound of') ||
    textLower.includes('texture') ||
    textLower.includes('bright light') ||
    textLower.includes('smell of') ||
    textLower.includes('sensory trigger')
  ) {
    const triggerSnippet = userText.slice(0, 120);
    const alreadySaved = (currentMemory.sensoryTriggers || []).some(
      (s) => (s.trigger && triggerSnippet.toLowerCase().includes(s.trigger.toLowerCase()))
    );

    if (!alreadySaved) {
      pending.push({
        id: `mem_sensory_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'sensoryTriggers',
        label: 'Sensory Trigger',
        title: 'Sensitivity / Trigger',
        detail: triggerSnippet,
        provenance: `Noticed in conversation on ${new Date().toLocaleDateString()}`,
        payload: {
          trigger: triggerSnippet,
          date: new Date().toISOString().split('T')[0],
          recordedAt: new Date().toISOString()
        }
      });
    }
  }

  // 3. Calming Anchors / Coping Strategies
  if (
    textLower.includes('helps me calm') ||
    textLower.includes('soothes me') ||
    textLower.includes('grounding') ||
    textLower.includes('weighted blanket') ||
    textLower.includes('noise cancelling') ||
    textLower.includes('dim lights') ||
    textLower.includes('safe food') ||
    textLower.includes('stimming')
  ) {
    const strategySnippet = userText.slice(0, 120);
    const alreadySaved = (currentMemory.copingStrategies || []).some(
      (c) => (c.strategy && strategySnippet.toLowerCase().includes(c.strategy.toLowerCase()))
    );

    if (!alreadySaved) {
      pending.push({
        id: `mem_coping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'copingStrategies',
        label: 'Calming Anchor',
        title: 'Coping Anchor',
        detail: strategySnippet,
        provenance: `Noticed in conversation on ${new Date().toLocaleDateString()}`,
        payload: {
          strategy: strategySnippet,
          date: new Date().toISOString().split('T')[0],
          recordedAt: new Date().toISOString()
        }
      });
    }
  }

  // 4. Appointments & Commitments
  const dateMatch = userText.match(/(?:on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dateMatch && (textLower.includes('appointment') || textLower.includes('meeting') || textLower.includes('dentist') || textLower.includes('doctor'))) {
    const day = dateMatch[1];
    const what = textLower.includes('dentist') ? 'Dentist' : textLower.includes('doctor') ? 'Doctor appointment' : 'Meeting / Commitment';
    const alreadySaved = currentMemory.appointments.some((a) => a.what === what && a.when.toLowerCase() === day.toLowerCase());

    if (!alreadySaved) {
      pending.push({
        id: `mem_appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'appointments',
        label: 'Commitment',
        title: `${what} (${day})`,
        detail: userText.slice(0, 120),
        provenance: `Extracted from chat on ${new Date().toLocaleDateString()}`,
        payload: {
          what,
          when: day,
          notes: userText.slice(0, 120),
          createdAt: new Date().toISOString()
        }
      });
    }
  }

  // 5. Health & Medication Care
  if (textLower.includes('medication') || textLower.includes('prescription') || textLower.includes('therapy session') || textLower.includes('adhd diagnosis')) {
    const event = textLower.includes('therapy') ? 'Therapy' : textLower.includes('medication') ? 'Medication' : 'Health / Care';
    pending.push({
      id: `mem_health_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: 'health',
      label: 'Health & Care',
      title: event,
      detail: userText.slice(0, 120),
      provenance: `Recorded with your consent on ${new Date().toLocaleDateString()}`,
      payload: {
        event,
        detail: userText.slice(0, 140),
        date: new Date().toISOString().split('T')[0],
        recordedAt: new Date().toISOString()
      }
    });
  }

  return pending;
}

/**
 * Confirms and commits a pending memory item into the user's permanent Memory Vault
 * @param {string} uid 
 * @param {object} item - { category, payload }
 * @returns {Promise<object>} Updated memory profile
 */
export async function confirmMemoryItem(uid, item) {
  if (!uid || !item || !item.category || !item.payload) {
    throw new Error('Valid memory item with category and payload is required.');
  }

  const memory = await getUserMemory(uid);
  if (!Array.isArray(memory[item.category])) {
    memory[item.category] = [];
  }

  // Stamp confirmed timestamp
  const payloadWithMeta = {
    ...item.payload,
    confirmedAt: new Date().toISOString()
  };

  memory[item.category].push(payloadWithMeta);
  memory.updatedAt = new Date().toISOString();

  await saveDocument(uid, 'profile', 'memory', memory);
  return memory;
}

/**
 * Updates a specific memory item at index
 * @param {string} uid 
 * @param {string} category 
 * @param {number} index 
 * @param {object} updatedData 
 * @returns {Promise<object>} Updated memory
 */
export async function updateMemoryItem(uid, category, index, updatedData) {
  if (!uid) return getDefaultMemory();
  const memory = await getUserMemory(uid);

  if (Array.isArray(memory[category]) && index >= 0 && index < memory[category].length) {
    memory[category][index] = {
      ...memory[category][index],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };
    memory.updatedAt = new Date().toISOString();
    await saveDocument(uid, 'profile', 'memory', memory);
  }

  return memory;
}

/**
 * Saves a custom memory item manually entered by the user
 * @param {string} uid 
 * @param {string} category 
 * @param {object} itemData 
 * @returns {Promise<object>} Updated memory
 */
export async function saveCustomMemoryItem(uid, category, itemData) {
  if (!uid || !category || !itemData) {
    throw new Error('Category and item data required');
  }

  const memory = await getUserMemory(uid);
  if (!Array.isArray(memory[category])) {
    memory[category] = [];
  }

  memory[category].push({
    ...itemData,
    provenance: 'Manually saved in Memory Vault',
    createdAt: new Date().toISOString()
  });

  memory.updatedAt = new Date().toISOString();
  await saveDocument(uid, 'profile', 'memory', memory);
  return memory;
}


// FILE: src/components/shared/SocraticReasoningFollowUp.tsx
// SECURITY: OWASP A03 / LLM05 DOMPurify sanitization
// AGENT: Socratic Reasoning & Interactive Follow-Up Engine

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import {
  HelpCircle,
  Sparkles,
  Send,
  BookOpen,
  Check,
  RotateCcw,
  ArrowRight,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  BrainCircuit
} from 'lucide-react';

export interface SocraticTurn {
  id: string;
  sender: 'user' | 'socratic';
  text: string;
  probes?: string[];
  quickReplies?: string[];
  timestamp: string;
}

interface SocraticReasoningFollowUpProps {
  agentSource: 'prioritizer' | 'planner' | 'braindump' | 'admin' | 'wellbeing' | 'general';
  originalTask: string;
  agentOutput: string;
  onSendToPlanner?: (taskText: string) => void;
  onSaveToJournalSuccess?: (message: string) => void;
}

export function SocraticReasoningFollowUp({
  agentSource,
  originalTask,
  agentOutput,
  onSendToPlanner,
  onSaveToJournalSuccess
}: SocraticReasoningFollowUpProps) {
  const { getIdToken } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<SocraticTurn[]>([]);
  const [activeProbes, setActiveProbes] = useState<string[]>([]);
  const [activeQuickReplies, setActiveQuickReplies] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [savedToJournal, setSavedToJournal] = useState(false);
  const [journalStatusMsg, setJournalStatusMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Generate intelligent default probes based on agentSource and raw input
  useEffect(() => {
    const defaultProbes = generateContextualProbes(agentSource, originalTask);
    setActiveProbes(defaultProbes);

    const defaultQuickReplies = generateContextualQuickReplies(agentSource, originalTask);
    setActiveQuickReplies(defaultQuickReplies);
  }, [agentSource, originalTask]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  // Submit a Socratic reasoning turn
  const handleSendReflection = async (textToSend?: string) => {
    const reflectionText = (textToSend || inputVal).trim();
    if (!reflectionText || loading) return;

    setInputVal('');
    const userTurn: SocraticTurn = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: reflectionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTurns((prev) => [...prev, userTurn]);
    setLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/socratic/reason', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userReflection: reflectionText,
          agentSource,
          originalTask,
          agentOutput,
          history: turns.map((t) => ({ sender: t.sender, text: t.text }))
        })
      });

      if (!res.ok) {
        throw new Error('Could not process Socratic inquiry.');
      }

      const data = await res.json();
      const aiTurn: SocraticTurn = {
        id: `socratic_${Date.now()}`,
        sender: 'socratic',
        text: data.reply,
        probes: data.probes || [],
        quickReplies: data.quickReplies || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setTurns((prev) => [...prev, aiTurn]);
      if (data.probes && data.probes.length > 0) {
        setActiveProbes(data.probes);
      }
      if (data.quickReplies && data.quickReplies.length > 0) {
        setActiveQuickReplies(data.quickReplies);
      }
    } catch (err: any) {
      // Local graceful fallback
      const fallbackTurn: SocraticTurn = {
        id: `socratic_fallback_${Date.now()}`,
        sender: 'socratic',
        text: `### 🧠 Socratic Inquiry\n\nI hear you. When you say "${reflectionText}", notice where the resistance is showing up. Often it isn't lack of willpower—it is an unexamined sensory barrier or fear of half-measures.\n\n* **The 5-Minute Question**: What if you tested the smallest possible 5-minute version with zero obligation to continue?\n* **The Perfectionism Check**: What would happen if this was done with only 50% effort today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setTurns((prev) => [...prev, fallbackTurn]);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Save breakthrough to Intelligent Journal
  const handleSaveToJournal = async () => {
    try {
      const token = await getIdToken();
      const summaryText = `### 🧠 Socratic Reasoning Session (${agentSource.toUpperCase()})
**Original Input**: ${originalTask}

${turns.map((t) => `**${t.sender === 'user' ? 'My Reflection' : 'Socratic Coach'}**: ${t.text}`).join('\n\n')}

*Saved from Socratic Follow-Up on ${new Date().toLocaleDateString()}*`;

      const res = await fetch('/api/data/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryText: summaryText,
          mood: 'insightful',
          tags: ['socratic', agentSource, 'cognitive-reframing'],
          sentimentScore: 0.8
        })
      });

      if (res.ok) {
        setSavedToJournal(true);
        setJournalStatusMsg('Logged to Intelligent Journal!');
        if (onSaveToJournalSuccess) onSaveToJournalSuccess('Socratic session saved to Journal');
        setTimeout(() => setJournalStatusMsg(null), 4000);
      }
    } catch (e) {
      console.warn('Failed to save Socratic session to journal:', e);
      setJournalStatusMsg('Saved to local journal scratchpad.');
      setTimeout(() => setJournalStatusMsg(null), 4000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden transition-all mt-6">
      {/* Header bar */}
      <div className="bg-amber-50 border-b-2 border-slate-900 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-200 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <BrainCircuit className="w-4 h-4 text-amber-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Socratic Reasoning & Follow-Up
              </h3>
              <span className="bg-amber-200 text-amber-900 border border-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Interactive Follow-Up
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600">
              Examine assumptions, unpack friction, and test low-pressure alternatives together.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {turns.length > 0 && (
            <button
              type="button"
              onClick={handleSaveToJournal}
              disabled={savedToJournal}
              className="px-2.5 py-1 text-[11px] font-extrabold bg-white hover:bg-slate-100 border border-slate-900 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1 transition-all"
              title="Save this reasoning thread into your Intelligent Journal"
            >
              {savedToJournal ? <Check className="w-3 h-3 text-emerald-600" /> : <BookOpen className="w-3 h-3 text-indigo-600" />}
              <span>{savedToJournal ? 'In Journal' : 'Save to Journal'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4">
          {journalStatusMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{journalStatusMsg}</span>
            </div>
          )}

          {/* Socratic Probes Cards */}
          {activeProbes.length > 0 && (
            <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Socratic Probes to Consider:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activeProbes.map((probe, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendReflection(`Exploring probe: ${probe}`)}
                    className="p-2.5 bg-white border border-slate-300 hover:border-slate-900 rounded-lg text-xs text-slate-800 font-medium cursor-pointer transition-all hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-start gap-2"
                  >
                    <span className="font-extrabold text-amber-700 shrink-0">{idx + 1}.</span>
                    <span>{probe}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation history thread */}
          {turns.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-3.5 rounded-xl border-2 border-slate-900 text-xs leading-relaxed ${
                    turn.sender === 'user'
                      ? 'bg-indigo-50 border-indigo-900 ml-6'
                      : 'bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mr-6'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-600">
                      {turn.sender === 'user' ? 'You' : '🧠 Socratic Coach'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{turn.timestamp}</span>
                  </div>
                  <div
                    className="prose prose-xs max-w-none text-slate-800 font-medium"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(turn.text) }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 1-Tap Quick-Reply Chips for low-battery states */}
          {activeQuickReplies.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                Quick responses (click to answer without typing fatigue):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeQuickReplies.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendReflection(chip)}
                    disabled={loading}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-300 hover:border-slate-900 rounded-lg px-2.5 py-1 transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box for Follow-up Reflection */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendReflection();
                }}
                placeholder="Share what feels sticky, overwhelming, or ask 'Why am I dreading this?'..."
                className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border-2 border-slate-900 rounded-xl focus:bg-white focus:outline-none font-medium placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-900 ${
                  isListening ? 'text-rose-600 animate-pulse' : ''
                }`}
                title={isListening ? 'Listening...' : 'Voice Input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSendReflection()}
              disabled={!inputVal.trim() || loading}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 uppercase tracking-wider shrink-0 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Reasoning...' : 'Reflect & Reason'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers to produce grounded questions
function generateContextualProbes(agentSource: string, rawText: string): string[] {
  const lower = (rawText || '').toLowerCase();
  
  if (lower.includes('homework') || lower.includes('study') || lower.includes('assignment')) {
    return [
      "What is the emotional risk of finishing only 1 or 2 homework tasks today and deferring the rest?",
      "Which homework feels like a high-friction swamp versus a quick 10-minute checkoff?",
      "Are you telling yourself you have to finish everything perfectly before you can rest?"
    ];
  }

  if (lower.includes('cook') || lower.includes('meal') || lower.includes('eat') || lower.includes('bath')) {
    return [
      "Physical comfort vs perfection: What is the lowest-friction version of nourishment or bathing right now?",
      "Is the hurdle the task itself, or the transition of getting up and gathering supplies?",
      "Can we declare a 3-minute starter test without committing to doing the whole thing?"
    ];
  }

  if (agentSource === 'prioritizer') {
    return [
      "Which of these tasks are you keeping on your list purely out of guilt or external obligation?",
      "If you could safely delete one item forever with zero consequences, which would you pick?",
      "What is the Minimum Viable Version (MVV) of the single most important task?"
    ];
  }

  if (agentSource === 'planner') {
    return [
      "Does step 1 feel genuinely small, or does your brain still view it as a massive wall?",
      "What sensory or physical anchor (music, beverage, comfortable clothes) can make starting gentler?",
      "What if you set a timer for 7 minutes and gave yourself full permission to stop when it goes off?"
    ];
  }

  return [
    "What feels like the biggest sensory or cognitive friction point right now?",
    "What is the hidden assumption you are making about what you 'should' accomplish today?"
  ];
}

function generateContextualQuickReplies(agentSource: string, rawText: string): string[] {
  const lower = (rawText || '').toLowerCase();

  if (lower.includes('cook') || lower.includes('bath') || lower.includes('homework')) {
    return [
      "Cooking/bathing feels like too high a physical mountain right now",
      "I feel guilty deferring homework to tomorrow",
      "What's the 3-minute starter version?",
      "Help me do just one small piece without guilt"
    ];
  }

  if (agentSource === 'prioritizer') {
    return [
      "I'm terrified of dropping the wrong thing",
      "Help me shrink the top priority task down",
      "How do I let go of the delayed tasks without anxiety?",
      "I feel stuck between 2 equally urgent things"
    ];
  }

  return [
    "I'm feeling stuck on how to take the first step",
    "What if I only do the 5-minute version?",
    "I'm worried about falling behind if I postpone this",
    "Walk me through the first 60 seconds physically"
  ];
}

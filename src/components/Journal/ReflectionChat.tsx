// FILE: src/components/Journal/ReflectionChat.tsx
// SECURITY: Directive 2 (OWASP LLM05 DOMPurify sanitization), Directive 6.4 (Preserve input on failure & ErrorBanner)
// AGENT: RICHA Conversational Journaling Companion, Memory Vault & Auto-Diary Interface

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../lib/sanitize';
import { ErrorBanner } from '../shared/ErrorBanner';
import {
  getUserStorageItem,
  setUserStorageItem,
  removeUserStorageItem
} from '../../utils/userStorage';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  BookOpen,
  Brain,
  CheckCircle2,
  Heart,
  Edit3,
  Calendar,
  Layers,
  X,
  RefreshCw,
  Clock,
  Shield,
  FileText,
  MapPin,
  Smile,
  Frown,
  Award,
  Bell,
  BellRing,
  Compass,
  Zap,
  ArrowRight,
  Trash2,
  Download,
  ShieldAlert,
  EyeOff,
  Sliders,
  ChevronDown
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  agentName?: string;
  intent?: string;
  timestamp: string;
  isJournalEntry?: boolean;
  pendingMemories?: Array<{
    category: string;
    key: string;
    value: string;
    originalText?: string;
    confidence?: number;
    status?: 'pending' | 'confirmed' | 'rejected';
  }>;
  orchestration?: {
    strategy?: string;
    primaryAgent?: string;
    secondaryAgent?: string;
    confidence?: number;
    isLowConfidence?: boolean;
    clarificationOptions?: Array<{
      agentId: string;
      label: string;
      prompt: string;
    }>;
    handoff?: {
      from: string;
      to: string;
      reason: string;
    };
  };
}

interface UserMemory {
  people: Array<{ name: string; relationship?: string; context?: string; lastMentioned?: string }>;
  health: Array<{ event: string; detail: string; date: string }>;
  appointments: Array<{ what: string; when: string; notes?: string }>;
  work: Array<{ topic: string; detail: string }>;
  moods: Array<{ mood: string; date: string }>;
  themes: string[];
  locations?: Array<{ placeName: string; context?: string; lastVisited?: string }>;
  emotionalLandmarks?: {
    happiest?: Array<{ moment: string; mood: string; date: string }>;
    lowest?: Array<{ moment: string; mood: string; date: string }>;
    proud?: Array<{ moment: string; mood: string; date: string }>;
    calm?: Array<{ moment: string; mood: string; date: string }>;
  };
  reminderSettings?: {
    enabled: boolean;
    time: string;
    frequency: string;
    gentleMessage: string;
  };
}

interface ReflectionChatProps {
  onNavigateTab?: (tab: 'overview' | 'chat' | 'planner' | 'prioritizer' | 'kanban' | 'braindump' | 'habits' | 'admin' | 'wellbeing', payload?: any) => void;
  handoffData?: any;
}

export function ReflectionChat({ onNavigateTab, handoffData }: ReflectionChatProps = {}) {
  const { user, getIdToken } = useAuth();
  const uid = user?.uid;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showMemoryVault, setShowMemoryVault] = useState(false);
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [userMemory, setUserMemory] = useState<UserMemory | null>(null);
  const [savedEntries, setSavedEntries] = useState<any[]>([]);
  const [errorInfo, setErrorInfo] = useState<{ message: string; unsavedPayload?: any } | null>(null);
  
  // Architectural Dimensions 1, 2, 5: Orchestration Controls, Sanctuary Mode & Verbosity
  const [verbosity, setVerbosity] = useState<'micro' | 'standard' | 'deep'>('standard');
  const [incognito, setIncognito] = useState<boolean>(false);
  const [selectedAgentOverride, setSelectedAgentOverride] = useState<string | null>(null);

  const handleConfirmMemory = async (msgId: string, item: any, index: number) => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/profile/memory/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId || !m.pendingMemories) return m;
            const updated = [...m.pendingMemories];
            updated[index] = { ...updated[index], status: 'confirmed' };
            return { ...m, pendingMemories: updated };
          })
        );
        fetchMemoryVault();
      }
    } catch (e) {
      console.error('Failed to confirm memory:', e);
    }
  };

  const handleRejectMemory = (msgId: string, index: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.pendingMemories) return m;
        const updated = [...m.pendingMemories];
        updated[index] = { ...updated[index], status: 'rejected' };
        return { ...m, pendingMemories: updated };
      })
    );
  };
  
  // Geolocation state
  const [currentLocation, setCurrentLocation] = useState<{
    placeName: string;
    lat?: number;
    long?: number;
    city?: string;
    country?: string;
  } | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);

  // Daily Reminder Notification state
  const [reminderActive, setReminderActive] = useState(true);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [showDueReminderBanner, setShowDueReminderBanner] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Acquire Geolocation
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatusMsg('Geolocation not supported on this device.');
      return;
    }

    setGeoLocating(true);
    setGeoStatusMsg('Detecting location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const long = pos.coords.longitude;
        
        // Reverse geocoding estimation
        let placeName = 'Local Area';
        try {
          // Approximate place naming
          placeName = `${lat.toFixed(2)}°N, ${long.toFixed(2)}°W`;
        } catch {
          placeName = 'Current Location';
        }

        setCurrentLocation({
          placeName,
          lat,
          long,
          city: 'Local',
          country: 'Local'
        });
        setGeoLocating(false);
        setGeoStatusMsg(`📍 Tagged: ${placeName}`);
        setTimeout(() => setGeoStatusMsg(null), 4000);
      },
      (err) => {
        setGeoLocating(false);
        console.warn('Geolocation permission or error:', err.message);
        setGeoStatusMsg('Location access optional (set manually in text if desired).');
        setTimeout(() => setGeoStatusMsg(null), 4000);
      },
      { timeout: 8000 }
    );
  };

  // Check Daily Reminder schedule on load
  useEffect(() => {
    // Check if user has already journaled today
    const checkReminder = () => {
      const todayStr = new Date().toDateString();
      const lastSessionDate = getUserStorageItem(uid, 'last_session_date');
      const reminderDismissed = sessionStorage.getItem('richa_reminder_dismissed');

      if (lastSessionDate !== todayStr && !reminderDismissed) {
        setShowDueReminderBanner(true);
      }
    };

    checkReminder();
  }, []);

  // Request browser notification permission if user desires
  const enableBrowserNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('RICHA Journaling Companion', {
          body: 'Gentle reminder active! Your space is ready for you whenever you want to pause.',
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Save Reminder Settings to Backend
  const saveReminderPreferences = async (enabled: boolean, time: string) => {
    setReminderActive(enabled);
    setReminderTime(time);
    try {
      const token = await getIdToken();
      await fetch('/api/data/profile/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          time,
          frequency: 'daily',
          gentleMessage: 'Time for a gentle pause. How was your day?'
        })
      });
      fetchMemoryVault();
    } catch (e) {
      console.warn('Failed to update reminder settings:', e);
    }
  };

  // Initialize Speech Recognition if supported
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
            setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Fetch Memory Vault data
  const fetchMemoryVault = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/profile/memory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setUserMemory(data.memory);
        }
      }
    } catch (err) {
      console.warn('Could not fetch memory profile:', err);
    }
  };

  // Fetch Saved Journal Entries
  const fetchSavedEntries = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/journal?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedEntries(data.items || []);
      }
    } catch (err) {
      console.warn('Could not fetch journal history:', err);
    }
  };

  // Load chat session history and draft keystroke on mount
  useEffect(() => {
    let isMounted = true;

    // Restore locally preserved draft keystrokes (Improvement J - Offline Protection)
    const savedDraft = getUserStorageItem(uid, 'draft_keystroke');
    if (savedDraft) {
      setInputValue(savedDraft);
    }

    async function loadHistory() {
      try {
        const token = await getIdToken();
        const res = await fetch('/api/data/sessions?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.items && data.items.length > 0) {
            const mapped: ChatMessage[] = [];
            const sortedItems = [...data.items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            for (const item of sortedItems) {
              if (item.userPrompt) {
                mapped.push({
                  id: `hist_user_${item.id}`,
                  sender: 'user',
                  text: item.userPrompt,
                  timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
              }
              if (item.aiResponse) {
                mapped.push({
                  id: `hist_ai_${item.id}`,
                  sender: 'assistant',
                  text: item.aiResponse,
                  agentName: item.agentName || 'RICHA Companion',
                  intent: item.intent,
                  isJournalEntry: item.aiResponse.includes('---') && item.aiResponse.toLowerCase().includes('entry'),
                  timestamp: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
              }
            }

            if (mapped.length > 0) {
              setMessages(mapped);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load past sessions:', err);
      }

      if (isMounted) {
        setMessages([
          {
            id: 'welcome-msg',
            sender: 'assistant',
            text: `Hey, good to have you here. What's on your mind today?\n\nJust talk like a human — I remember what you share, and whenever you're ready, I'll write your journal for you in your own voice.`,
            agentName: 'RICHA Companion',
            intent: 'conversational_journal',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    }

    loadHistory();
    fetchMemoryVault();

    return () => {
      isMounted = false;
    };
  }, [user, getIdToken]);

  // Handle Forget Memory Item (Improvement L - Privacy & Sovereignty)
  const handleForgetMemory = async (category: string, index: number) => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/profile/memory/forget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category, index })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) setUserMemory(data.memory);
      }
    } catch (e) {
      console.warn('Failed to forget memory item:', e);
    }
  };

  // Handle Clear All Memories (Improvement L)
  const handleClearAllMemories = async () => {
    if (!window.confirm("Are you sure you want RICHA to forget all saved memories? Your past written journal entries will remain safe.")) {
      return;
    }
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/profile/memory/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) setUserMemory(data.memory);
      }
    } catch (e) {
      console.warn('Failed to clear memories:', e);
    }
  };

  // Handle Full Journal Export (Improvement L)
  const handleExportVault = async () => {
    try {
      const token = await getIdToken();
      const res = await fetch('/api/data/export/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const exportData = await res.json();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `richa_journal_vault_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn('Failed to export vault:', e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Text-To-Speech helper
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Strip markdown for speaking
      const plainText = text.replace(/[#*`_~]/g, '').replace(/---[\s\S]*$/, '').trim();
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
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
        console.error('Mic start error:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string, overrideAgentParam?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const currentInput = text;
    if (!textToSend) setInputValue('');
    setErrorInfo(null);

    const userMsgId = `user_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: currentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const token = await getIdToken();
      
      // Track session date to satisfy daily reminder check
      const todayStr = new Date().toDateString();
      setUserStorageItem(uid, 'last_session_date', todayStr);
      setShowDueReminderBanner(false);

      const resolvedOverride = overrideAgentParam || selectedAgentOverride || undefined;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: currentInput,
          sessionId: 'main-reflection-session',
          voiceMode,
          overrideAgent: resolvedOverride,
          verbosity,
          incognito,
          location: currentLocation || undefined,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setInputValue(currentInput);
        setErrorInfo({
          message: data.message || 'Failed to communicate with RICHA.',
          unsavedPayload: data.retryContext?.unsavedPayload
        });
        return;
      }

      const isJournalDraft = Boolean(
        data.metadata?.isJournalEntry ||
        (data.reply && data.reply.includes('---') && (data.reply.toLowerCase().includes('entry') || data.reply.toLowerCase().includes('better?')))
      );

      const aiMsg: ChatMessage = {
        id: data.messageId || `ai_${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        agentName: data.agentName || 'RICHA Companion',
        intent: data.intent,
        isJournalEntry: isJournalDraft,
        pendingMemories: data.pendingMemories ? data.pendingMemories.map((m: any) => ({ ...m, status: 'pending' })) : undefined,
        orchestration: data.orchestration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Speak if voice mode or TTS enabled
      if (voiceMode || ttsEnabled) {
        speakText(data.reply);
      }

      // Clear locally preserved draft on successful transmission
      removeUserStorageItem(uid, 'draft_keystroke');

      // Refresh memory in background
      fetchMemoryVault();
      if (data.metadata?.saved) {
        fetchSavedEntries();
      }
    } catch (err: any) {
      setInputValue(currentInput);
      setErrorInfo({
        message: err.message || 'Network error connecting to RICHA server.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3.5 border-b-2 border-slate-900 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>RICHA</span>
              <span className="text-xs font-semibold text-slate-500">• Journaling Companion</span>
            </h2>
            <p className="text-xs text-slate-500">Talk like a human — your journal writes itself.</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sensory Shield Fast Trigger Button (Dimension 2: Fast-path Shield) */}
          <button
            type="button"
            onClick={() => handleSendMessage('/shield', 'sensory_shield')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Fast-path Sensory Shield for acute sensory overload, overwhelm, or panic"
          >
            <Shield className="w-3.5 h-3.5 fill-white text-white" />
            <span>🛡️ Sensory Shield</span>
          </button>

          {/* Sanctuary Mode / Incognito Toggle (Dimension 5: Sovereignty & Privacy) */}
          <button
            type="button"
            onClick={() => setIncognito(!incognito)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all ${
              incognito
                ? 'bg-rose-100 text-rose-950 border-rose-900 font-extrabold shadow-[2px_2px_0px_0px_rgba(159,18,57,1)]'
                : 'bg-white hover:bg-slate-100 text-slate-700'
            }`}
            title="Sanctuary Mode: Off-the-record conversation. Ephemeral context without writing memories or audit logs."
          >
            <EyeOff className={`w-3.5 h-3.5 ${incognito ? 'text-rose-700' : 'text-slate-500'}`} />
            <span>{incognito ? 'Sanctuary (Off-Record)' : 'Sanctuary'}</span>
          </button>

          {/* Verbosity Selector (Dimension 3: Cognitive Load Minimization) */}
          <div className="flex items-center rounded-lg border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setVerbosity('micro')}
              className={`px-2 py-1 font-bold transition-all ${
                verbosity === 'micro' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Micro verbosity: 1-2 bullet points or short sentence"
            >
              Micro
            </button>
            <button
              type="button"
              onClick={() => setVerbosity('standard')}
              className={`px-2 py-1 font-bold border-x border-slate-300 transition-all ${
                verbosity === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Standard verbosity: Balanced response"
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setVerbosity('deep')}
              className={`px-2 py-1 font-bold transition-all ${
                verbosity === 'deep' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Deep reflection: Detailed exploratory response"
            >
              Deep
            </button>
          </div>

          {/* Agent Override Dropdown (Dimension 1 & 2) */}
          <select
            value={selectedAgentOverride || ''}
            onChange={(e) => setSelectedAgentOverride(e.target.value ? e.target.value : null)}
            className="px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none cursor-pointer"
            title="Force standalone routing to a specific specialized agent"
          >
            <option value="">Auto-Route (RICHA)</option>
            <option value="companion">1. Companion</option>
            <option value="planner">2. Time-Box Planner</option>
            <option value="prioritizer">3. 4D Prioritizer</option>
            <option value="admin_buffer">4. Admin & Buffer</option>
            <option value="sensory_shield">5. Sensory Shield</option>
            <option value="bullet_journal">6. Bullet Journal</option>
            <option value="kanban_habits">7. Kanban & Habits</option>
            <option value="reflection">8. Reflection & Diary</option>
          </select>

          {/* Direct Synthesize Journal Entry Button */}
          <button
            type="button"
            onClick={() => handleSendMessage('/write')}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Turn your chat conversation into a first-person diary entry"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>✨ Synthesize Journal Entry</span>
          </button>

          {/* Geo-tagging Button */}
          <button
            type="button"
            onClick={captureLocation}
            disabled={geoLocating}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all ${
              currentLocation ? 'bg-emerald-100 text-emerald-900 border-emerald-900 font-extrabold' : 'bg-white hover:bg-slate-100 text-slate-700'
            }`}
            title="Attach your physical location to memories and journal entries"
          >
            <MapPin className={`w-3.5 h-3.5 ${currentLocation ? 'text-emerald-700' : 'text-slate-500'}`} />
            <span>{currentLocation ? currentLocation.placeName : (geoLocating ? 'Locating...' : 'Tag Location')}</span>
          </button>

          {/* Daily Reminder Button */}
          <button
            type="button"
            onClick={() => setShowReminderSettings(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-amber-50 text-amber-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all"
            title="Configure daily journaling reminder times and notifications"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>Reminders</span>
          </button>

          {/* Voice Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setVoiceMode(!voiceMode);
              if (!voiceMode) setTtsEnabled(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all ${
              voiceMode ? 'bg-amber-300 text-slate-900 font-extrabold' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {voiceMode ? <Volume2 className="w-3.5 h-3.5 text-slate-900" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>Voice Mode</span>
          </button>

          {/* Memory Vault Button */}
          <button
            type="button"
            onClick={() => {
              fetchMemoryVault();
              setShowMemoryVault(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-600" />
            <span>Feelings & Memories</span>
          </button>

          {/* Past Entries Button */}
          <button
            type="button"
            onClick={() => {
              fetchSavedEntries();
              setShowJournalHistory(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Diary History ({savedEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Geolocation Status Feedback Toast */}
      {geoStatusMsg && (
        <div className="bg-emerald-50 border-b border-emerald-300 px-6 py-1.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          <span>{geoStatusMsg}</span>
        </div>
      )}

      {/* Daily Reflection Reminder Notification Banner */}
      {showDueReminderBanner && (
        <div className="bg-indigo-50 border-b-2 border-indigo-200 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-950 font-medium">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-indigo-600 animate-bounce" />
            <span><strong>Daily Check-in Reminder:</strong> You haven't paused to journal yet today. Take 2 minutes to unload your mind.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowDueReminderBanner(false);
                sessionStorage.setItem('richa_reminder_dismissed', 'true');
              }}
              className="text-slate-500 hover:text-slate-800 text-xs underline font-semibold cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Persistence Error Banner (Directive 6.4) */}
      {errorInfo && (
        <div className="px-6 pt-3">
          <ErrorBanner
            message={errorInfo.message}
            onRetry={() => handleSendMessage()}
            onDismiss={() => setErrorInfo(null)}
            retryLoading={loading}
          />
        </div>
      )}

      {/* Voice Mode Banner */}
      {voiceMode && (
        <div className="bg-amber-100/90 border-b border-amber-300 px-6 py-2 flex items-center justify-between text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Voice Mode Active — Responses are spoken out loud. Tap the mic below to speak.</span>
          </div>
          <button
            onClick={() => setVoiceMode(false)}
            className="text-amber-800 font-bold hover:underline"
          >
            Disable
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isEntry = msg.isJournalEntry;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-600" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800">{msg.agentName || 'RICHA'}</span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    {/* Listen Button */}
                    <button
                      onClick={() => speakText(msg.text)}
                      title="Read out loud"
                      className="text-slate-400 hover:text-indigo-600 p-0.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Bubble styling: Special card for journal drafts */}
                {isEntry ? (
                  <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 shadow-xs text-slate-900 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                          Auto-Generated Journal Entry (First Person)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                        Draft Ready
                      </span>
                    </div>

                    <div
                      className="font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(msg.text) }}
                    />

                    {/* Quick tone adjustment / save pills */}
                    <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-900">Refine:</span>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Can you make it sound less formal and more natural?')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 shadow-2xs"
                      >
                        Make less formal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Can you make it shorter and more concise?')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 shadow-2xs"
                      >
                        Make shorter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage('Can you deepen the emotional reflection?')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 shadow-2xs"
                      >
                        Add deeper reflection
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSendMessage('Perfect, save it');
                          setTimeout(() => {
                            fetchSavedEntries();
                            setShowJournalHistory(true);
                          }, 1200);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center gap-1.5 ml-auto border border-emerald-700 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Save & View Diary</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div>
                        <div
                          className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                          dangerouslySetInnerHTML={{ __html: sanitizeHTML(msg.text) }}
                        />

                        {/* Interlinked Agent Suggestions when overwhelmed, task heavy, or planning is relevant */}
                        {onNavigateTab && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Tools:</span>
                            
                            {(msg.text.toLowerCase().includes('wellbeing') || msg.text.toLowerCase().includes('overwhelm') || msg.text.toLowerCase().includes('exhaust') || msg.text.toLowerCase().includes('drain') || msg.text.toLowerCase().includes('sensory')) && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('wellbeing')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[11px] shadow-2xs transition-colors"
                              >
                                <Shield className="w-3 h-3 text-emerald-600" />
                                <span>Sensory Wellbeing</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}

                            {(msg.text.toLowerCase().includes('4d') || msg.text.toLowerCase().includes('priorit') || msg.text.toLowerCase().includes('too many') || msg.text.toLowerCase().includes('delete delay') || msg.text.toLowerCase().includes('overwhelm')) && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('prioritizer')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] shadow-2xs transition-colors"
                              >
                                <Zap className="w-3 h-3 text-amber-600" />
                                <span>4D Prioritizer</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}

                            {(msg.text.toLowerCase().includes('plan') || msg.text.toLowerCase().includes('chunk') || msg.text.toLowerCase().includes('time box') || msg.text.toLowerCase().includes('break down') || msg.text.toLowerCase().includes('schedule')) && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('planner')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold text-[11px] shadow-2xs transition-colors"
                              >
                                <Clock className="w-3 h-3 text-indigo-600" />
                                <span>Time-Box Planner</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}

                            {(msg.text.toLowerCase().includes('kanban') || msg.text.toLowerCase().includes('board') || msg.text.toLowerCase().includes('wip') || msg.text.toLowerCase().includes('done')) && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('kanban')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 font-bold text-[11px] shadow-2xs transition-colors"
                              >
                                <Layers className="w-3 h-3 text-blue-600" />
                                <span>Kanban Flow</span>
                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onNavigateTab('overview')}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-medium text-[10px] ml-auto"
                            >
                              <span>Bento Hub</span>
                              <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          </div>
                        )}

                        {/* Agent Handoff Notice (Dimension 2: Explicit Hand-off) */}
                        {msg.orchestration?.handoff && (
                          <div className="mt-2.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900 font-medium">
                            <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              <strong>Explicit Handoff:</strong> Handed off from <em>{msg.orchestration.handoff.from}</em> to <em>{msg.orchestration.handoff.to}</em> ({msg.orchestration.handoff.reason})
                            </span>
                          </div>
                        )}

                        {/* Low-Confidence Disambiguation (Dimension 1) */}
                        {msg.orchestration?.isLowConfidence && msg.orchestration.clarificationOptions && msg.orchestration.clarificationOptions.length > 0 && (
                          <div className="mt-3 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl space-y-2">
                            <p className="text-xs font-extrabold text-indigo-950">
                              To best match your cognitive energy right now, which path feels easiest?
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {msg.orchestration.clarificationOptions.map((opt) => (
                                <button
                                  key={opt.agentId}
                                  type="button"
                                  onClick={() => handleSendMessage(opt.prompt, opt.agentId)}
                                  className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 text-xs font-bold rounded-lg border border-indigo-300 shadow-2xs transition-all"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Memory Receipts (Dimension 5 & 1: Trust & Explicit Consent) */}
                        {msg.pendingMemories && msg.pendingMemories.length > 0 && (
                          <div className="mt-3 p-3 bg-amber-50/90 border-2 border-amber-300 rounded-2xl shadow-2xs space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Brain className="w-4 h-4 text-amber-700" />
                              <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                Memory Receipt • Pending Confirmation
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900/80 font-medium">
                              RICHA identified these facts. Would you like them stored in your Memory Vault?
                            </p>

                            <div className="space-y-1.5">
                              {msg.pendingMemories.map((mem, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs text-xs"
                                >
                                  <div className="min-w-0">
                                    <span className="inline-block px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md bg-amber-100 text-amber-900 border border-amber-300 mr-1.5">
                                      {mem.category}
                                    </span>
                                    <span className="font-bold text-slate-900">{mem.key}: </span>
                                    <span className="text-slate-700 font-medium">{mem.value}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {mem.status === 'confirmed' ? (
                                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Saved in Vault</span>
                                      </span>
                                    ) : mem.status === 'rejected' ? (
                                      <span className="text-xs font-medium text-slate-400">Discarded</span>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleConfirmMemory(msg.id, mem, idx)}
                                          className="px-2.5 py-1 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Keep in Vault</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRejectMemory(msg.id, idx)}
                                          className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                        >
                                          Dismiss
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Agent Re-route Controls (Dimension 1) */}
                        <div className="mt-3 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Re-route:</span>
                          {[
                            { id: 'planner', label: 'Planner' },
                            { id: 'prioritizer', label: 'Prioritizer' },
                            { id: 'sensory_shield', label: 'Sensory Shield' },
                            { id: 'companion', label: 'Companion' },
                            { id: 'reflection', label: 'Reflection' }
                          ].map((ag) => (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => {
                                const prevUserMsg = [...messages].reverse().find(m => m.sender === 'user');
                                handleSendMessage(prevUserMsg ? `Please process this with ${ag.label}: ${prevUserMsg.text}` : `Help me with ${ag.label}`, ag.id);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 text-[10px] font-bold text-slate-600 transition-colors"
                            >
                              {ag.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-xs text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
              <span className="font-medium text-slate-500 ml-1">RICHA is listening & reflecting...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts & Auto-Write Bar */}
      <div className="px-6 py-2.5 bg-slate-100 border-t-2 border-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => handleSendMessage('/shield', 'sensory_shield')}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>🛡️ Sensory Shield (/shield)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('/write')}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Write My Journal (/write)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('/plan', 'planner')}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-900 font-bold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1"
        >
          <Clock className="w-3 h-3 text-indigo-600" />
          <span>Plan My Day (/plan)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage('/prioritize', 'prioritizer')}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-amber-900 font-bold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1"
        >
          <Zap className="w-3 h-3 text-amber-600" />
          <span>4D Prioritize (/prioritize)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage("Can you remind me what I've shared with you about my life so far?")}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
        >
          Remind me what you remember
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage("I had a fight with my sister today")}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
        >
          Talk through conflict
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage("My boss keeps piling on more work and I can't say no")}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-lg border-2 border-slate-900 text-xs whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
        >
          Work boundaries
        </button>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-4 border-t-2 border-slate-900 bg-white flex items-end gap-3"
      >
        <div className="flex-1 relative">
          <textarea
            id="reflection-chat-input"
            rows={2}
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              setUserStorageItem(uid, 'draft_keystroke', val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Tell RICHA what's happening or how you feel... Type /write anytime to generate your entry."
            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white resize-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
          />
        </div>

        {/* Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'Stop listening' : 'Start speaking'}
          className={`h-11 px-3.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center transition-all ${
            isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send Button */}
        <button
          id="reflection-chat-send"
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="h-11 px-5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          <span>Send</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Memory Vault Modal / Drawer */}
      {showMemoryVault && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-slate-900 bg-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">RICHA's Memory Vault</h3>
              </div>
              <button
                onClick={() => setShowMemoryVault(false)}
                className="p-1 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <p className="text-xs text-slate-600 leading-relaxed">
                Everything RICHA has remembered about your life from your conversations. This context helps RICHA write your journal in your own voice and support you without repeating questions.
              </p>

              {/* People Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>People in Your Life</span>
                </h4>
                {userMemory?.people && userMemory.people.length > 0 ? (
                  <div className="space-y-2">
                    {userMemory.people.map((p, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-indigo-900">{p.name}</span>
                          {p.relationship && <span className="text-slate-500 ml-1">({p.relationship})</span>}
                          {p.context && <p className="text-slate-600 mt-0.5">{p.context}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForgetMemory('people', idx)}
                          title="Forget this person"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No people mentioned yet (e.g., Jason).</p>
                )}
              </div>

              {/* Health & Medical Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Health & Diagnosis</span>
                </h4>
                {userMemory?.health && userMemory.health.length > 0 ? (
                  <div className="space-y-2">
                    {userMemory.health.map((h, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{h.event}</span>
                          <p className="text-slate-600 mt-0.5">{h.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForgetMemory('health', idx)}
                          title="Forget this health item"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No health items recorded.</p>
                )}
              </div>

              {/* Appointments Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Upcoming Commitments & Dates</span>
                </h4>
                {userMemory?.appointments && userMemory.appointments.length > 0 ? (
                  <div className="space-y-2">
                    {userMemory.appointments.map((a, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{a.what}</span>
                          <span className="text-amber-700 font-bold ml-2">({a.when})</span>
                          {a.notes && <p className="text-slate-500 mt-0.5">{a.notes}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForgetMemory('appointments', idx)}
                          title="Forget this appointment"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No upcoming appointments logged.</p>
                )}
              </div>

              {/* Emotional Landmarks & Feelings Analysis (Happiest, Lowest, Proud, Calm) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-amber-500" />
                  <span>Emotional Landmarks & Feelings Analysis</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Happiest Moments */}
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs mb-1.5">
                      <Smile className="w-3 h-3 text-amber-600" />
                      <span>Happiest / Joyful Moments</span>
                    </div>
                    {userMemory?.emotionalLandmarks?.happiest && userMemory.emotionalLandmarks.happiest.length > 0 ? (
                      <div className="space-y-1.5">
                        {userMemory.emotionalLandmarks.happiest.map((m, idx) => (
                          <div key={idx} className="text-[11px] bg-white p-2 rounded border border-amber-200/60">
                            <p className="text-slate-800 font-medium">"{m.moment}"</p>
                            <span className="text-[10px] text-amber-700 font-mono mt-0.5 block">{m.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No peak joy moments tagged yet.</p>
                    )}
                  </div>

                  {/* Lowest / Vulnerable Moments */}
                  <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 font-bold text-rose-950 text-xs mb-1.5">
                      <Frown className="w-3 h-3 text-rose-600" />
                      <span>Lowest / Heavy Moments</span>
                    </div>
                    {userMemory?.emotionalLandmarks?.lowest && userMemory.emotionalLandmarks.lowest.length > 0 ? (
                      <div className="space-y-1.5">
                        {userMemory.emotionalLandmarks.lowest.map((m, idx) => (
                          <div key={idx} className="text-[11px] bg-white p-2 rounded border border-rose-200/60">
                            <p className="text-slate-800 font-medium">"{m.moment}"</p>
                            <span className="text-[10px] text-rose-700 font-mono mt-0.5 block">{m.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No low points tagged yet.</p>
                    )}
                  </div>

                  {/* Proud Accomplishments */}
                  <div className="bg-indigo-50/80 border border-indigo-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs mb-1.5">
                      <Award className="w-3 h-3 text-indigo-600" />
                      <span>Proud Moments</span>
                    </div>
                    {userMemory?.emotionalLandmarks?.proud && userMemory.emotionalLandmarks.proud.length > 0 ? (
                      <div className="space-y-1.5">
                        {userMemory.emotionalLandmarks.proud.map((m, idx) => (
                          <div key={idx} className="text-[11px] bg-white p-2 rounded border border-indigo-200/60">
                            <p className="text-slate-800 font-medium">"{m.moment}"</p>
                            <span className="text-[10px] text-indigo-700 font-mono mt-0.5 block">{m.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No proud achievements recorded yet.</p>
                    )}
                  </div>

                  {/* Calm & Peaceful Moments */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs mb-1.5">
                      <Heart className="w-3 h-3 text-emerald-600" />
                      <span>Calm & Grounded Moments</span>
                    </div>
                    {userMemory?.emotionalLandmarks?.calm && userMemory.emotionalLandmarks.calm.length > 0 ? (
                      <div className="space-y-1.5">
                        {userMemory.emotionalLandmarks.calm.map((m, idx) => (
                          <div key={idx} className="text-[11px] bg-white p-2 rounded border border-emerald-200/60">
                            <p className="text-slate-800 font-medium">"{m.moment}"</p>
                            <span className="text-[10px] text-emerald-700 font-mono mt-0.5 block">{m.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No calm milestones logged yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Geo-tagged Locations Memory Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Geo-Tagged Memory Places</span>
                </h4>
                {userMemory?.locations && userMemory.locations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userMemory.locations.map((loc, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{loc.placeName}</span>
                            {loc.context && <p className="text-slate-600 text-[11px] mt-0.5">{loc.context}</p>}
                            {loc.lastVisited && <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Visited {loc.lastVisited}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForgetMemory('locations', idx)}
                          title="Forget this location"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No locations tagged yet. Tap "Tag Location" above or mention places in your reflections!</p>
                )}
              </div>

              {/* Work & Boundaries */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-700" />
                  <span>Work & Boundary Notes</span>
                </h4>
                {userMemory?.work && userMemory.work.length > 0 ? (
                  <div className="space-y-2">
                    {userMemory.work.map((w, idx) => (
                      <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{w.topic}</span>
                          <p className="text-slate-600 mt-0.5">{w.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleForgetMemory('work', idx)}
                          title="Forget this work note"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No work stress patterns recorded.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t-2 border-slate-900 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportVault}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Export Vault (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllMemories}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Memories</span>
                </button>
              </div>
              <button
                onClick={() => setShowMemoryVault(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Journaling Reminder Settings Modal */}
      {showReminderSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-slate-900 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-extrabold text-slate-900">Daily Journaling Reminder</h3>
              </div>
              <button
                onClick={() => setShowReminderSettings(false)}
                className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <p className="leading-relaxed">
                Neurodivergent executive function support works best with predictable, gentle cues. Set your preferred daily reflection window:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between font-bold text-slate-900">
                  <span>Enable Daily Reminders</span>
                  <input
                    type="checkbox"
                    checked={reminderActive}
                    onChange={(e) => saveReminderPreferences(e.target.checked, reminderTime)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                </label>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Daily Pause Time</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => saveReminderPreferences(reminderActive, e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-950">
                <p className="font-bold mb-1">Browser Notifications</p>
                <p className="text-[11px] text-indigo-800 mb-2">Receive gentle desktop prompts when it's time to pause and reflect.</p>
                <button
                  type="button"
                  onClick={enableBrowserNotifications}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-[11px] shadow-xs cursor-pointer"
                >
                  Enable Browser Push Notifications
                </button>
              </div>
            </div>

            <div className="p-4 border-t-2 border-slate-900 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowReminderSettings(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Journal History Modal */}
      {showJournalHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-slate-900 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">Saved Journal Entries</h3>
              </div>
              <button
                onClick={() => setShowJournalHistory(false)}
                className="p-1 text-slate-600 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {savedEntries.length > 0 ? (
                savedEntries.map((entry, idx) => (
                  <div key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{entry.title || 'Diary Entry'}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {entry.mood && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-900 capitalize">
                              Mood: {entry.mood}
                            </span>
                          )}
                          {entry.emotionalLandmark && entry.emotionalLandmark !== 'neutral' && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 border border-purple-300 text-[10px] font-bold text-purple-900 capitalize">
                              ★ {entry.emotionalLandmark} moment
                            </span>
                          )}
                          {entry.location?.placeName && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-emerald-700" />
                              <span>{entry.location.placeName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="font-serif text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {entry.content || 'Saved reflection.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No journal entries saved yet. Chat with RICHA and type <span className="font-mono font-bold text-indigo-600">/write</span> to create your first entry!
                </div>
              )}
            </div>

            <div className="p-4 border-t-2 border-slate-900 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowJournalHistory(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReflectionChat;

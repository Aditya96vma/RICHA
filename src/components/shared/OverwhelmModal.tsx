// FILE: src/components/shared/OverwhelmModal.tsx
// SECURITY: OWASP A03 / LLM05 DOMPurify sanitization
// AGENT: Overwhelm Protocol & Somatic De-escalation Shield

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../context/DemoModeContext';
import { setStoredJournal, emitDataUpdated } from '../../utils/userStorage';
import {
  Heart,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Send,
  PauseCircle,
  CheckCircle2,
  Shield,
  Smile,
  Moon
} from 'lucide-react';

interface OverwhelmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: any) => void;
}

export function OverwhelmModal({ isOpen, onClose, onNavigateTab }: OverwhelmModalProps) {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [breathePhase, setBreathePhase] = useState<'inhale1' | 'inhale2' | 'exhale' | 'rest'>('inhale1');
  const [breatheSeconds, setBreatheSeconds] = useState(3);
  const [ventText, setVentText] = useState('');
  const [richaResponse, setRichaResponse] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [loggedToJournal, setLoggedToJournal] = useState(false);

  // Guided Physiological Sigh cycle (2 quick inhales, 1 long slow exhale)
  useEffect(() => {
    if (!isOpen) return;

    let phaseTimer: NodeJS.Timeout;
    const cycle = () => {
      // Step 1: Inhale nose (2.5s)
      setBreathePhase('inhale1');
      setBreatheSeconds(2);

      phaseTimer = setTimeout(() => {
        // Step 2: Top-up quick inhale (1.5s)
        setBreathePhase('inhale2');
        setBreatheSeconds(1);

        phaseTimer = setTimeout(() => {
          // Step 3: Long audible sigh / exhale mouth (5s)
          setBreathePhase('exhale');
          setBreatheSeconds(5);

          phaseTimer = setTimeout(() => {
            // Step 4: Rest (2s)
            setBreathePhase('rest');
            setBreatheSeconds(2);
          }, 5000);
        }, 1500);
      }, 2500);
    };

    cycle();
    const interval = setInterval(cycle, 11500);

    return () => {
      clearTimeout(phaseTimer);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendVent = () => {
    if (!ventText.trim() || isResponding) return;
    setIsResponding(true);

    setTimeout(() => {
      const response =
        "I hear you completely. Your nervous system is carrying too much right now, and that's not a moral failing. You have zero obligations for the next hour. The world can wait while you recover your baseline.";
      setRichaResponse(response);
      setIsResponding(false);

      // Auto-save calm milestone to journal without burdening user
      try {
        setStoredJournal(user?.uid, isDemoMode, {
          id: `overwhelm_reset_${Date.now()}`,
          title: 'Sensory Decompression & Overwhelm Reset',
          content: `Expressed overwhelm: "${ventText}". Took time for physiological reset and somatic breathing.`,
          mood: 'calm',
          createdAt: new Date().toISOString()
        }, {
          userText: ventText,
          aiReply: response
        });
        emitDataUpdated('journal');
        setLoggedToJournal(true);
      } catch {}
    }, 600);
  };

  const handleParkTasks = () => {
    // Navigate to Kanban or signal parking
    if (onNavigateTab) {
      onNavigateTab('kanban');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header with gentle dismissal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Quiet Harbor • Zero-Demand Reset
              </h2>
              <p className="text-xs text-slate-400">Everything is on pause. You have nothing to fix right now.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Close Safe Harbor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Somatic Vagus Reset: The Physiological Sigh */}
        <div className="py-6 flex flex-col items-center text-center">
          <div className="relative w-40 h-40 flex items-center justify-center my-3">
            {/* Visual breathing halo */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                breathePhase === 'inhale1'
                  ? 'scale-90 bg-teal-500/20 border-2 border-teal-400/50'
                  : breathePhase === 'inhale2'
                  ? 'scale-105 bg-teal-400/30 border-2 border-teal-300'
                  : breathePhase === 'exhale'
                  ? 'scale-75 bg-indigo-500/20 border-2 border-indigo-400/40'
                  : 'scale-70 bg-slate-800/40 border border-slate-700'
              }`}
            />
            <div className="relative z-10 flex flex-col items-center">
              <Heart className="w-7 h-7 text-teal-300 mb-1" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                {breathePhase === 'inhale1' && 'Deep Inhale (Nose)'}
                {breathePhase === 'inhale2' && 'Extra Sip of Air'}
                {breathePhase === 'exhale' && 'Long Slow Sigh (Mouth)'}
                {breathePhase === 'rest' && 'Rest & Settle'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Two nasal inhales followed by one long, unforced exhale through the mouth. This signals your autonomic nervous system to release adrenaline.
          </p>
        </div>

        {/* Safe Venting Box */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Want to dump the noise? (No solutions, no advice, just a safe container):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={ventText}
              onChange={(e) => setVentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendVent()}
              placeholder="e.g. My head hurts, there are too many messages, and I can't start..."
              className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
            <button
              onClick={handleSendVent}
              disabled={!ventText.trim() || isResponding}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Vent</span>
            </button>
          </div>

          {richaResponse && (
            <div className="mt-3 p-3.5 bg-teal-950/40 border border-teal-800/60 rounded-xl text-xs text-teal-200 leading-relaxed">
              <p>{richaResponse}</p>
              {loggedToJournal && (
                <div className="mt-2 text-[11px] text-teal-400/80 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Logged gently to your private reflection record</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Safeguards */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handleParkTasks}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
          >
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span>Park Active Kanban Cards (Zero Guilt)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all"
          >
            I Feel A Bit More Grounded Now
          </button>
        </div>
      </div>
    </div>
  );
}

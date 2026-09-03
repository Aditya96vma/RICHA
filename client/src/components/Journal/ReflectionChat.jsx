// FILE: client/src/components/Journal/ReflectionChat.jsx
// SECURITY: Directive 2 (DOMPurify Sanitization), Directive 6.4 (Persistence Error Handling)
// AGENT: Multi-Agent Interactive Chat & Reflection Interface

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { sanitizeHTML } from '../../lib/sanitize.js';
import { ErrorBanner } from '../shared/ErrorBanner.jsx';
import { Send, Bot, Sparkles, User } from 'lucide-react';

export function ReflectionChat() {
  const { user, getIdToken } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Welcome to ARIA. Share how you are feeling, drop a brain dump, or ask me to break down an overwhelming task.",
      agentName: 'ARIA Orchestrator',
      timestamp: 'Now'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    const text = inputValue;
    setInputValue('');
    setErrorInfo(null);

    setMessages(prev => [...prev, { id: `u_${Date.now()}`, sender: 'user', text, timestamp: 'Now' }]);
    setLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: text, sessionId: 'main-chat' })
      });

      const data = await res.json();
      if (!res.ok) {
        setInputValue(text);
        setErrorInfo({ message: data.message || 'Error occurred.' });
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          id: data.messageId,
          sender: 'assistant',
          text: data.reply,
          agentName: data.agentName,
          timestamp: 'Now'
        }
      ]);
    } catch (err) {
      setInputValue(text);
      setErrorInfo({ message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <span>ARIA Multi-Agent Reflection</span>
        </h3>
      </div>

      {errorInfo && (
        <div className="p-3">
          <ErrorBanner message={errorInfo.message} onRetry={handleSend} onDismiss={() => setErrorInfo(null)} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3.5 rounded-2xl max-w-xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'}`}>
              {msg.sender === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(msg.text) }} />
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-slate-500 italic">ARIA is analyzing and routing...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your reflection or task here..."
          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm"
        />
        <button onClick={handleSend} disabled={loading || !inputValue.trim()} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl">
          Send
        </button>
      </div>
    </div>
  );
}

export default ReflectionChat;

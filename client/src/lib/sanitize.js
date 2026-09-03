// FILE: client/src/lib/sanitize.js
// SECURITY: Directive 2 (OWASP LLM05 / A03) — Mandatory DOMPurify sanitization
// AGENT: Frontend Security Sanitizer

import DOMPurify from 'dompurify';

export function sanitizeHTML(rawString) {
  if (!rawString || typeof rawString !== 'string') {
    return '';
  }

  let html = rawString
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-slate-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-900 mt-4 mb-2">$1</h1>')
    .replace(/^---$/gim, '<hr class="my-3 border-slate-200" />')
    .replace(/^\s*[-•*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br />');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li', 'br', 'hr', 'code', 'pre', 'span', 'blockquote'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false
  });
}

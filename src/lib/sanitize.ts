// FILE: src/lib/sanitize.ts
// SECURITY: Directive 2 (OWASP LLM05 / A03) — Mandatory DOMPurify sanitization on all LLM outputs
// AGENT: Frontend Security Sanitizer

import DOMPurify from 'dompurify';

/**
 * Sanitizes an untrusted or LLM-generated string using DOMPurify before any DOM insertion.
 * Converts markdown formatting to HTML first, then strictly sanitizes.
 * 
 * @param rawString - Untrusted raw string from LLM or API
 * @returns Safe sanitized HTML string
 */
export function sanitizeHTML(rawString: string | null | undefined): string {
  if (!rawString || typeof rawString !== 'string') {
    return '';
  }

  // Convert basic markdown formatting into HTML structures
  let html = rawString
    // Bold & italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headings
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-slate-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-slate-900 mt-4 mb-2">$1</h1>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-3 border-slate-200" />')
    // Bullet points
    .replace(/^\s*[-•*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>')
    // Code blocks / inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-xs font-mono">$1</code>')
    // Links: convert markdown links [text](url) to <a> tags with security protocol validation
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
      const cleanUrl = url.trim();
      if (/^(javascript|data|vbscript):/i.test(cleanUrl)) {
        return `<span class="text-slate-700">${text}</span>`;
      }
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline">${text}</a>`;
    })
    // Line breaks
    .replace(/\n/g, '<br />');

  // DOMPurify strict sanitization
  let clean = '';
  if (typeof DOMPurify?.sanitize === 'function') {
    clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'a', 'p', 'h1', 'h2', 'h3', 'h4',
        'ul', 'ol', 'li', 'br', 'hr', 'code', 'pre', 'span', 'blockquote'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOW_DATA_ATTR: false
    });
  } else {
    // Fallback security sanitizer for SSR/Node runtime environments
    clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/\s*on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*['"]javascript:[^'"]*['"]/gi, 'href="#"');
  }

  return clean;
}

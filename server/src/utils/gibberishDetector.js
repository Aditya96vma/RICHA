// FILE: server/src/utils/gibberishDetector.js
// Detects keyboard smashes, gibberish strings, wordless typing, or brain-fog inputs.

/**
 * Determines whether a string is a keyboard smash, gibberish, or wordless expression of overwhelm.
 * 
 * Examples:
 * - 'ddyjdjydjy' (repetitive consonant n-grams)
 * - 'asdfghjkl', 'asdfgh', 'zxcvbnm' (home/keyboard row smash)
 * - 'aaaaaaa', 'zzzzzz' (repeated character)
 * - '.......', '??????' (punctuation/symbol spam)
 * - 'dskjfhkjsdhfksdhf' (high consonant clustering / unpronounceable)
 * 
 * @param {string} text - User input string
 * @returns {boolean}
 */
export function isGibberishOrKeysmash(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // 1. Punctuation spam or symbol spam (e.g. '????', '.......', '!@#$%')
  if (/^[\p{P}\p{S}\s]{2,}$/u.test(trimmed)) return true;

  // 2. Repeated single character (e.g. 'aaaaaa', 'zzzzzz', '111111')
  if (/^(.)\1{3,}$/i.test(lower)) return true;

  // 3. Repeated 2-3 char chunks (e.g. 'djydjydjy', 'hahahaha', 'xyzxyzxyz', 'fjkfjkfjk')
  if (/^([a-z0-9]{2,3})\1{2,}$/i.test(lower)) return true;

  // 4. Specific known keyboard row runs
  if (/^[asdfghjkl;']+$/i.test(lower) && lower.length >= 4) return true;
  if (/^[qwertyuiop]+$/i.test(lower) && lower.length >= 5) return true;
  if (/^[zxcvbnm]+$/i.test(lower) && lower.length >= 4) return true;

  // 5. Common expressive keysmashes & prefixes
  const keysmashPrefixes = [
    'ddyjdjydjy', 'asdf', 'qwerty', 'zxcvbn', 'hjkl', 'jklm',
    'lskdf', 'sdlfk', 'sldkjf', 'fjdksl', 'aksjdf', 'ajksdhf',
    'dfgh', 'ghjk', 'fghj', 'cvbn', 'bnm', 'werty'
  ];
  for (const prefix of keysmashPrefixes) {
    if (lower.startsWith(prefix) && lower.length >= 4) return true;
  }

  // 6. Natural word check vs consonant cluster keysmash
  const words = lower.split(/\s+/);
  const commonShortWords = new Set([
    'my', 'by', 'gym', 'fly', 'cry', 'dry', 'shy', 'why', 'sky', 'try',
    'lynx', 'myth', 'sync', 'rhythm', 'hymn', 'crypt', 'spy', 'ply', 'fry'
  ]);

  for (const w of words) {
    const lettersOnly = w.replace(/[^a-z]/gi, '');
    if (lettersOnly.length >= 4) {
      // 5+ consecutive consonants without standard vowels
      if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(lettersOnly)) return true;
      // High repetition of short chunks inside word (e.g. 'ddyjdjydjy')
      if (/([a-z]{2,3})\1{2,}/i.test(lettersOnly)) return true;
      // Low vowel ratio in words >= 6 chars
      const vowels = (lettersOnly.match(/[aeiou]/gi) || []).length;
      if (lettersOnly.length >= 6 && vowels === 0 && !commonShortWords.has(lettersOnly)) {
        return true;
      }
      if (lettersOnly.length >= 7 && (vowels / lettersOnly.length) < 0.15 && !commonShortWords.has(lettersOnly)) {
        return true;
      }
    }
  }

  return false;
}

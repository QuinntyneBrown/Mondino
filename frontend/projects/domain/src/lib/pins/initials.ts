/**
 * A teammate's initials: the first character of up to the first two words of their name, in
 * capitals, so a pin is never blank, whatever the name begins with (L2-011). As the backend's
 * `TeammateInitials`, a character is a whole grapheme, so an emoji is not cut in half.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => firstCharacter(word).toLocaleUpperCase('en')).join('');
  return initials || '?';
}

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

function firstCharacter(word: string): string {
  for (const { segment } of graphemes.segment(word)) return segment;
  return '';
}

/** The most characters an email may have, as the backend allows. */
export const emailLimit = 254;

/**
 * An email in the form `local@domain.tld`: one `@` with something before it, a dot inside the
 * domain, no space, at most 254 characters once trimmed. The backend's own rule (`EmailAddress`);
 * the backend checks again whatever the screen found.
 */
export function isEmailAddress(text: string): boolean {
  const value = text.trim();
  const at = value.indexOf('@');
  if (value.length > emailLimit || at <= 0 || at !== value.lastIndexOf('@') || /\s/.test(value))
    return false;
  const domain = value.slice(at + 1);
  return domain.indexOf('.') > 0 && !domain.endsWith('.');
}

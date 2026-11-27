/** A teammate's first name, the first word of their name, as the overlap names them. It is data. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

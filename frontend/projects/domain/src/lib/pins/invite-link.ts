/** The team's invite link: the address of Join for its invite token (L2-025, L2-054). */
export function inviteLinkFor(origin: string, inviteToken: string): string {
  return `${origin}/join/${encodeURIComponent(inviteToken)}`;
}

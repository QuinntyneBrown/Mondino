/**
 * What opening an invite link has come to. `Full` is a team with all 500 of its places taken,
 * when the link is opened or when a join is refused with `team_full` (L2-005).
 */
export type InviteState = 'Loading' | 'Ready' | 'AlreadyJoined' | 'NotFound' | 'Full' | 'Failed';

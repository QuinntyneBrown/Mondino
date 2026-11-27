/**
 * What opening an invite link has come to. `Full` joins with `join-team` (journey 4), which holds
 * the rule of 500 places.
 */
export type InviteState = 'Loading' | 'Ready' | 'AlreadyJoined' | 'NotFound' | 'Failed';

/**
 * Where joining stands once the city is found (L2-005). A join refused with 429 is the lookup's
 * own `RateLimited` state, as the mock draws it, and a full team or a link that no longer works is
 * an `InviteState`.
 */
export type JoinState = 'Idle' | 'Joining' | 'Failed';

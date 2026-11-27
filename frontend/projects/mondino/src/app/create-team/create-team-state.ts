import type { CreatedTeam } from '@mondino/api';

/**
 * Where making the team stands (L2-053). A postal code lookup refused with 429 is the lookup's
 * own `RateLimited` state, as `create-team/rate-limited` draws it; making the team has no rate
 * limit (ADR 0016), so a 429 from it, should one arrive, is `Failed`.
 */
export type CreateTeamState =
  | { readonly kind: 'Idle' }
  | { readonly kind: 'Creating' }
  | { readonly kind: 'Created'; readonly team: CreatedTeam }
  | { readonly kind: 'Failed' };

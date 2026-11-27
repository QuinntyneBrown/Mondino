import type { CreatedTeam } from '@mondino/api';

/**
 * Where making the team stands (L2-053). A request refused with 429 is the lookup's own
 * `RateLimited` state, as `create-team/rate-limited` draws it.
 */
export type CreateTeamState =
  | { readonly kind: 'Idle' }
  | { readonly kind: 'Creating' }
  | { readonly kind: 'Created'; readonly team: CreatedTeam }
  | { readonly kind: 'Failed' };

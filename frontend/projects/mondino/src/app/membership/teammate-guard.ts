import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { TEAM_MEMBERSHIP } from '@mondino/api';

/**
 * Lets a team's screen match only when the browser remembers a team. Otherwise the same address
 * matches "You need an invite link", in place. A convenience only: the backend refuses a team's
 * data to anyone who is not its teammate (L2-043).
 */
export const teammateGuard: CanMatchFn = () => inject(TEAM_MEMBERSHIP).current() !== null;

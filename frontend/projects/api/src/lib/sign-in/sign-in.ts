import { InjectionToken } from '@angular/core';
import type { Membership } from '../membership/team-membership';

/**
 * What opening a good sign-in link came to: the team its teammate is now signed in to, or, when
 * the email is on no team, that email, for "You need an invite link". Never both.
 */
export interface SignInResult {
  readonly membership: Membership | null;
  readonly email: string | null;
}

/** Sign In's side of the backend, open to anyone. A refusal is an `ApiError`. */
export interface SignInApi {
  /**
   * Asks for a sign-in link for `email`, which travels in the body. Answered alike whatever the
   * email (L2-043). Refused with `validation_failed`, `rate_limited` or `cross_site_request`.
   */
  requestLink(email: string, signal: AbortSignal): Promise<void>;

  /**
   * Opens a sign-in link by its token, which travels in the body, never in the address. A good
   * link of a teammate starts their session, an `HttpOnly` cookie. Refused with
   * `sign_in_link_unusable` (unknown, used or expired) or `rate_limited`.
   */
  redeem(signInToken: string, signal: AbortSignal): Promise<SignInResult>;
}

export const SIGN_IN_API = new InjectionToken<SignInApi>('SignInApi');

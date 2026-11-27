import { Injectable } from '@angular/core';
import { post, postJson } from '../http/request';
import type { SignInApi, SignInResult } from './sign-in';

/** `SignInApi` over HTTP. The Sign In route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpSignInApi implements SignInApi {
  requestLink(email: string, signal: AbortSignal): Promise<void> {
    return post('/api/sign-in-links', { email }, signal);
  }

  redeem(signInToken: string, signal: AbortSignal): Promise<SignInResult> {
    return postJson<SignInResult>('/api/sign-in-links/redemptions', { signInToken }, signal);
  }
}

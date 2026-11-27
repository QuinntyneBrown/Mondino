import { Injectable } from '@angular/core';
import { getJson } from '../http/request';
import type { Invite, InviteApi } from './invite';

/** `InviteApi` over HTTP. The Join route binds it, so it stays out of the initial bundle. */
@Injectable()
export class HttpInviteApi implements InviteApi {
  getInvite(inviteToken: string, signal: AbortSignal): Promise<Invite> {
    return getJson<Invite>(`/api/invites/${encodeURIComponent(inviteToken)}`, signal);
  }
}

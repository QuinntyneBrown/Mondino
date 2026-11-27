import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiError, INVITE_API, type Invite } from '@mondino/api';
import type { InviteState } from './invite-state';

/**
 * The Join screen's state, provided at its route so it goes when the person leaves. It opens the
 * invite link and maps the answer, or the refusal's code, to an `InviteState`. A pending request
 * is aborted when the screen is left or the link is opened again.
 */
@Injectable()
export class JoinStore {
  private readonly api = inject(INVITE_API);
  private pending: AbortController | null = null;

  private readonly inviteValue = signal<Invite | null>(null);
  private readonly stateValue = signal<InviteState>('Loading');

  /** The team as its invite link shows it, once it is open. */
  readonly invite = this.inviteValue.asReadonly();
  readonly inviteState = this.stateValue.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pending?.abort());
  }

  async open(inviteToken: string): Promise<void> {
    this.pending?.abort();
    const pending = new AbortController();
    this.pending = pending;
    this.inviteValue.set(null);
    this.stateValue.set('Loading');
    try {
      const invite = await this.api.getInvite(inviteToken, pending.signal);
      if (pending.signal.aborted) return;
      this.inviteValue.set(invite.alreadyJoined ? null : invite);
      this.stateValue.set(invite.alreadyJoined ? 'AlreadyJoined' : 'Ready');
    } catch (error) {
      if (pending.signal.aborted) return;
      this.stateValue.set(stateFor(error));
    } finally {
      if (this.pending === pending) this.pending = null;
    }
  }
}

/** A refused open says the link no longer works only for `invite_not_found`; anything else failed. */
function stateFor(error: unknown): InviteState {
  return error instanceof ApiError && error.code === 'invite_not_found' ? 'NotFound' : 'Failed';
}

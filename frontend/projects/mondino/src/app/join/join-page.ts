import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Avatar,
  AvatarGroup,
  Button,
  GlobeFallback,
  GlobePlaceholder,
  LookupMessage,
  Notice,
  SelectField,
  type SelectOption,
  Skeleton,
  TextField,
  Wordmark,
} from '@mondino/components';
import { stillPlacements } from '@mondino/domain';
import { JoinStore } from './join-store';

/**
 * Join, as an invite link opens it: the team's name and count, a few teammates' initials, the
 * form and the globe with the team's bare pins, before the person has given anything (L2-001).
 * The form is drawn here and does nothing yet: the postal code lookup and joining are journeys
 * 3 and 4.
 */
@Component({
  selector: 'mo-join-page',
  imports: [
    Avatar,
    AvatarGroup,
    Button,
    GlobeFallback,
    GlobePlaceholder,
    LookupMessage,
    Notice,
    RouterLink,
    SelectField,
    Skeleton,
    TextField,
    Wordmark,
  ],
  providers: [JoinStore],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPage {
  protected readonly store = inject(JoinStore);
  private readonly router = inject(Router);
  private readonly inviteToken = inject(ActivatedRoute).snapshot.paramMap.get('inviteToken') ?? '';

  protected readonly countries = computed<SelectOption[]>(() =>
    (this.store.invite()?.countries ?? []).map((country) => ({
      value: country.code,
      label: country.name,
    })),
  );

  /** The team's bare pins on the still globe, until the 3D globe draws them (journey 8). */
  protected readonly pins = computed(() => {
    const invite = this.store.invite();
    return invite ? stillPlacements(invite.positions) : [];
  });

  protected readonly globeLabel = computed(() => {
    const invite = this.store.invite();
    if (!invite || invite.positions.length === 0) return 'The globe, with no pins';
    const count = invite.positions.length;
    return `The globe, with ${count} ${count === 1 ? 'pin' : 'pins'}: one for each teammate already in ${invite.teamName}`;
  });

  constructor() {
    void this.store.open(this.inviteToken);

    // A teammate already in the team on this device goes to the Globe; no second pin is made.
    effect(() => {
      if (this.store.inviteState() === 'AlreadyJoined') {
        void this.router.navigateByUrl('/globe', { replaceUrl: true });
      }
    });
  }

  /** Opens the invite link again: it has not been used up. */
  protected tryAgain(): void {
    void this.store.open(this.inviteToken);
  }

  /** The form does nothing yet: placing a pin is the postal code lookup's (journey 3). */
  protected hold(event: Event): void {
    event.preventDefault();
  }
}

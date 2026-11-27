import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Alert,
  type AlertLink,
  Avatar,
  AvatarGroup,
  Button,
  CityField,
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
import { TEAM_MEMBERSHIP } from '@mondino/api';
import { stillPlacements } from '@mondino/domain';
import type { JustJoined } from '../globe/just-joined';
import { JoinStore, nameLimit } from './join-store';

/**
 * Join, as an invite link opens it: the team's name and count, a few teammates' initials, the
 * form and the globe with the team's bare pins, before the person has given anything (L2-001).
 * The form asks for a name, a country and a postal code (L2-002) and says what is missing;
 * joining is journey 4.
 */
@Component({
  selector: 'mo-join-page',
  imports: [
    Alert,
    Avatar,
    AvatarGroup,
    Button,
    CityField,
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
  private readonly membership = inject(TEAM_MEMBERSHIP);
  /** Counts the submits that found a problem: each moves focus to the summary. */
  protected readonly summaryFocus = signal(0);

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
    return invite && this.store.inviteState() === 'Ready' ? stillPlacements(invite.positions) : [];
  });

  /** The join is being answered: the form is locked (L2-005). */
  protected readonly joining = computed(() => this.store.joinState() === 'Joining');

  /** The new pin at the city found, until joining puts it on the team (journey 4). */
  protected readonly you = computed(() => {
    const lookup = this.store.lookup();
    if (lookup.kind !== 'Found' || this.store.inviteState() !== 'Ready') return null;
    const [placement] = stillPlacements([lookup.result.city.position]);
    return placement ? { ...placement, label: `You · ${lookup.result.city.name}` } : null;
  });

  protected readonly globeLabel = computed(() => {
    const invite = this.store.inviteState() === 'Ready' ? this.store.invite() : null;
    const lookup = this.store.lookup();
    if (invite && lookup.kind === 'Found') {
      const count = invite.positions.length;
      return `The globe, with your new pin in ${lookup.result.city.name} and ${count} ${count === 1 ? 'teammate’s pin' : 'teammates’ pins'}`;
    }
    if (!invite || invite.positions.length === 0) return 'The globe, with no pins';
    const count = invite.positions.length;
    return `The globe, with ${count} ${count === 1 ? 'pin' : 'pins'}: one for each teammate already in ${invite.teamName}`;
  });

  /** The lookup is down: "Your city" stands in for the postal code (L2-004). */
  protected readonly lookupDown = computed(() => {
    const kind = this.store.lookup().kind;
    return kind === 'Unavailable' || (kind === 'Found' && this.store.chosenCity() !== null);
  });

  /** The wait after too many tries, as "0:42". */
  protected readonly countdown = computed(() => {
    const seconds = this.store.secondsToWait();
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  /** The wait as it was when the alert appeared: announced once, not at each tick. */
  protected readonly countdownSpoken = computed(() => {
    const lookup = this.store.lookup();
    return lookup.kind === 'RateLimited' ? untracked(() => this.countdown()) : '';
  });

  protected readonly nameError = computed(() => {
    if (!this.store.submitted()) return null;
    switch (this.store.nameProblem()) {
      case 'Missing':
        return 'Add your name so teammates know whose pin this is.';
      case 'TooLong':
        return `Add your name so teammates know whose pin this is, in ${nameLimit} characters or fewer.`;
      default:
        return null;
    }
  });

  protected readonly postalCodeError = computed(() =>
    this.store.submitted() && this.store.postalCodeMissing() ? 'Enter a postal code.' : null,
  );

  /** The summary above the fields after a submit with something missing or wrong (L2-002). */
  protected readonly summary = computed<{ title: string; items: AlertLink[] } | null>(() => {
    const items: AlertLink[] = [];
    const nameProblem = this.nameError() ? this.store.nameProblem() : null;
    if (nameProblem === 'Missing') items.push({ label: 'Add your name', target: 'name' });
    if (nameProblem === 'TooLong') items.push({ label: 'Shorten your name', target: 'name' });
    if (this.postalCodeError()) items.push({ label: 'Enter a postal code', target: 'postal' });
    if (items.length === 0) return null;
    const count = items.length === 1 ? 'One thing' : 'Two things';
    const allMissing = nameProblem !== 'TooLong';
    return {
      title: allMissing
        ? `${count} ${items.length === 1 ? 'is' : 'are'} missing`
        : `${count} to fix`,
      items,
    };
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

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.store.lookup().kind === 'Found') {
      void this.joinTeam();
      return;
    }
    if (this.store.submit()) this.summaryFocus.update((count) => count + 1);
  }

  /**
   * Joins the team; once in, remembers it and opens the Globe with the new pin, which travels in the
   * navigation state, never in the address (L2-005, L2-007).
   */
  private async joinTeam(): Promise<void> {
    const lookup = this.store.lookup();
    const invite = this.store.invite();
    const result = await this.store.join();
    if (!result || !invite || lookup.kind !== 'Found') return;
    this.membership.remember({
      teamId: result.teamId,
      teammateId: result.teammateId,
      teamName: invite.teamName,
    });
    const justJoined: JustJoined = {
      teammateId: result.teammateId,
      name: this.store.name().trim(),
      cityName: lookup.result.city.name,
      position: lookup.result.city.position,
    };
    await this.router.navigateByUrl('/globe', { state: { justJoined } });
  }

  /** A link in the summary moves focus to its field. */
  protected focusField(id: string): void {
    document.getElementById(id)?.focus();
  }
}

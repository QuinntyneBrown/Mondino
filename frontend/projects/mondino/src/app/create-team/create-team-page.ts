import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLIPBOARD, TEAM_MEMBERSHIP } from '@mondino/api';
import {
  Alert,
  Button,
  CityField,
  CopyField,
  GlobeFallback,
  LookupMessage,
  SelectField,
  type SelectOption,
  TextField,
  Toast,
  Wordmark,
} from '@mondino/components';
import { stillPlacements } from '@mondino/domain';
import { type CreateTeamField, CreateTeamStore, emailLimit, nameLimit } from './create-team-store';

/** The words under a field that is missing or wrong (L2-053). */
const messages: Record<CreateTeamField, Record<string, string>> = {
  team: {
    Missing: 'Give your team a name — teammates see it when they join.',
    TooLong: `Give your team a name — teammates see it when they join — in ${nameLimit} characters or fewer.`,
  },
  name: {
    Missing: 'Add your name so teammates know whose pin this is.',
    TooLong: `Add your name so teammates know whose pin this is, in ${nameLimit} characters or fewer.`,
  },
  email: {
    Missing: 'Add your work email — we’ll send sign-in links there.',
    NotAnEmail: 'That doesn’t look like an email address.',
  },
  postal: { Missing: 'Enter a postal code.' },
};

/** The ids of the fields, as the mocks name them. */
const fieldIds: Record<CreateTeamField, string> = {
  team: 'team',
  name: 'name',
  email: 'email',
  postal: 'postal',
};

/**
 * Create Team, "Start a team." (L2-053): a team name, the maker's name, work email, country and
 * postal code, looked up as on Join; once the team is made, its invite link to copy and the way on
 * to the globe. It draws the `auth` block itself (docs/adr/0009).
 */
@Component({
  selector: 'mo-create-team-page',
  imports: [
    Alert,
    Button,
    CityField,
    CopyField,
    GlobeFallback,
    LookupMessage,
    RouterLink,
    SelectField,
    TextField,
    Toast,
    Wordmark,
  ],
  providers: [CreateTeamStore],
  templateUrl: './create-team-page.html',
  styleUrl: './create-team-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTeamPage {
  protected readonly store = inject(CreateTeamStore);
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clipboard = inject(CLIPBOARD);

  protected readonly nameLimit = nameLimit;
  protected readonly emailLimit = emailLimit;

  protected readonly countries: SelectOption[] = this.store.countries.map((country) => ({
    value: country.code,
    label: country.name,
  }));

  protected readonly copied = signal(false);
  /** Counts the refused copies: each selects the link again. */
  protected readonly selectRequest = signal(0);
  protected readonly copyRefused = signal(false);

  /** The team once it is made. */
  protected readonly created = computed(() => {
    const state = this.store.state();
    return state.kind === 'Created' ? state.team : null;
  });

  /** The invite link as it is copied, and as it is read: without its scheme. */
  protected readonly inviteLink = computed(() => {
    const team = this.created();
    return team ? `${location.origin}/join/${encodeURIComponent(team.inviteToken)}` : '';
  });
  protected readonly inviteLinkShown = computed(() =>
    this.inviteLink().replace(/^https?:\/\//, ''),
  );

  /** The maker's new pin, once the city is found, on the still globe until journey 8 draws the 3D one. */
  protected readonly you = computed(() => {
    const lookup = this.store.lookup();
    if (lookup.kind !== 'Found') return null;
    const [placement] = stillPlacements([lookup.result.city.position]);
    return placement ? { ...placement, label: `You · ${lookup.result.city.name}` } : null;
  });

  protected readonly globeLabel = computed(() => {
    const lookup = this.store.lookup();
    return lookup.kind === 'Found'
      ? `The globe, with your new pin in ${lookup.result.city.name}`
      : 'The globe, with no pins';
  });

  /** The lookup is down: "Your city" stands in for the postal code (L2-004). */
  protected readonly lookupDown = computed(() => {
    const kind = this.store.lookup().kind;
    return kind === 'Unavailable' || (kind === 'Found' && this.store.chosenCity() !== null);
  });

  /** The wait after too many tries, as "9:42". */
  protected readonly countdown = computed(() => {
    const seconds = this.store.secondsToWait();
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  /** The wait as it was when the alert appeared: announced once, not at each tick. */
  protected readonly countdownSpoken = computed(() =>
    this.store.lookup().kind === 'RateLimited' ? untracked(() => this.countdown()) : '',
  );

  protected readonly errors = computed(() => {
    const shown: Partial<Record<CreateTeamField, string>> = {};
    if (!this.store.submitted()) return shown;
    const problems = this.store.problems();
    for (const field of Object.keys(problems) as CreateTeamField[]) {
      const problem = problems[field];
      const message = problem ? messages[field][problem] : undefined;
      if (message) shown[field] = message;
    }
    return shown;
  });

  /** The field to move focus to after a submit with a problem; a new object each time. */
  private readonly focusRequest = signal<{ field: string } | null>(null);
  private readonly titleFocused = signal(false);

  constructor() {
    afterRenderEffect(() => {
      const request = this.focusRequest();
      if (request) document.getElementById(request.field)?.focus();
    });
    // Once the team is made, focus moves to the title.
    afterRenderEffect(() => {
      if (this.created() && !untracked(() => this.titleFocused())) {
        document.getElementById('created-title')?.focus();
        this.titleFocused.set(true);
      }
    });
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const wrong = await this.store.submit();
    if (wrong) {
      this.focusRequest.set({ field: fieldIds[wrong] });
      return;
    }
    const team = this.created();
    if (team)
      this.membership.remember({
        teamId: team.teamId,
        teammateId: team.teammateId,
        teamName: team.teamName,
      });
  }

  /** Copies the invite link; a refusal selects it and says how to copy it by hand (L2-054). */
  protected async copy(): Promise<void> {
    try {
      await this.clipboard.write(this.inviteLink());
      this.copied.set(true);
      this.copyRefused.set(false);
    } catch {
      this.copied.set(false);
      this.selectRequest.update((count) => count + 1);
      this.copyRefused.set(true);
    }
  }

  protected dismissToast(): void {
    this.copyRefused.set(false);
  }
}

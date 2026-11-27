import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLOCK, HttpProfileApi, PROFILE_API } from '@mondino/api';
import {
  Alert,
  Button,
  EmptyState,
  GlobeFallback,
  GlobePlaceholder,
  LookupMessage,
  SaveBar,
  SelectField,
  type SelectOption,
  Skeleton,
  TextField,
} from '@mondino/components';
import {
  BrowserClock,
  defaultClockFormat,
  formatTime,
  localTime,
  stillPlacements,
  supportedCountries,
  timeZoneName,
} from '@mondino/domain';
import { type GlobeState, GlobeView, type NewPin } from '@mondino/globe';
import { TeamStore } from '../team/team-store';
import { ProfileStore } from './profile-store';

/**
 * Profile & Settings, "Your pin" (L2-031): the viewer's own pin on a small globe that does not turn
 * on its own and cannot be dragged, their city and country, local time and time zone, and the
 * Location section, where a teammate who has moved looks a new postal code up and saves it
 * (L2-032). The postal code shown is the viewer's own, the only one any screen shows after joining.
 * Display, sharing and leaving join with journeys 23 and 24.
 */
@Component({
  selector: 'mo-profile-page',
  imports: [
    Alert,
    Button,
    EmptyState,
    GlobeFallback,
    GlobePlaceholder,
    GlobeView,
    LookupMessage,
    RouterLink,
    SaveBar,
    SelectField,
    Skeleton,
    TextField,
  ],
  // The screen's state, its client and one clock, released with it.
  providers: [
    ProfileStore,
    { provide: PROFILE_API, useClass: HttpProfileApi },
    { provide: CLOCK, useClass: BrowserClock },
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly store = inject(ProfileStore);
  private readonly team = inject(TeamStore);
  private readonly clock = inject(CLOCK);

  protected readonly countries: SelectOption[] = supportedCountries.map((country) => ({
    value: country.code,
    label: country.name,
  }));

  /** The country chosen in the draft, with the form its postal codes take. */
  protected readonly country = computed(
    () => supportedCountries.find((country) => country.code === this.store.countryCode()) ?? null,
  );

  /** "Milan, Italy". */
  protected readonly place = computed(() => {
    const pin = this.store.profile()?.pin;
    return pin ? `${pin.cityName}, ${pin.country}` : '';
  });

  /** "15:05 local · Central European Time", ticking with the one clock. */
  protected readonly time = computed(() => {
    const pin = this.store.profile()?.pin;
    if (!pin) return '';
    this.clock.minute();
    const now = untracked(() => this.clock.now());
    const time = formatTime(localTime(now, pin.timeZoneId), defaultClockFormat(pin.country));
    return `${time} local · ${timeZoneName(pin.timeZoneId, now)}`;
  });

  /** The city a found postal code lies in, not saved yet. */
  private readonly found = computed(() => {
    const lookup = this.store.lookup();
    return lookup.kind === 'Found' && this.store.canSave() ? lookup.result.city : null;
  });

  /** The viewer's pin on the small globe: where it is saved, or "New · Toronto" where it is found. */
  protected readonly pin = computed<NewPin | null>(() => {
    const found = this.found();
    if (found) return { position: found.position, label: `New · ${found.name}`, still: true };
    const pin = this.store.profile()?.pin;
    return pin ? { position: pin.position, label: null, still: true } : null;
  });

  /** The same pin on the still picture. */
  protected readonly stillPin = computed(() => {
    const pin = this.pin();
    const [placement] = pin ? stillPlacements([pin.position]) : [];
    return pin && placement ? { ...placement, label: pin.label, still: true } : null;
  });

  protected readonly globeLabel = computed(() => {
    const found = this.found();
    if (found) return `A small globe with your pin moved to ${found.name}, not saved yet`;
    return `A small globe with your pin at ${this.store.profile()?.pin.cityName ?? ''}`;
  });

  /** Whether the 3D globe is drawn, or the still picture stands in for it (L2-008). */
  protected readonly globeState = signal<GlobeState>('Loading');

  /** The city the pin stays in until a new one is saved: "Milan". */
  protected readonly stays = computed(() => this.store.profile()?.pin.cityName ?? '');

  /** "We couldn’t check M5V 2T6 right now. …" (L2-032). */
  protected readonly unavailable = computed(
    () =>
      `We couldn’t check ${this.store.postalCode().trim()} right now. Your postal code may be fine — nothing is wrong with what you typed. Your pin stays in ${this.stays()}.`,
  );

  protected readonly rateLimited = computed(
    () =>
      `That was a lot of tries in a short time. Wait a moment, then try again. Your pin stays in ${this.stays()}.`,
  );

  constructor() {
    void this.store.load();
  }

  protected tryAgain(): void {
    void this.store.load();
  }

  /** Saves the new location; the team is read again so every screen shows the pin there. */
  protected async save(): Promise<void> {
    if (await this.store.save()) void this.team.load();
  }
}

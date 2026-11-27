import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CLOCK,
  type ClockFormat,
  HttpProfileApi,
  type MomentKind,
  PROFILE_API,
  type TemperatureUnit,
} from '@mondino/api';
import {
  Alert,
  Button,
  EmptyState,
  GlobeFallback,
  GlobePlaceholder,
  LookupMessage,
  SaveBar,
  Segmented,
  type SegmentedOption,
  SelectField,
  type SelectOption,
  Skeleton,
  Switch,
  TextField,
} from '@mondino/components';
import {
  BrowserClock,
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
 * (L2-032), and the settings: Display (L2-033), Moments on the globe (L2-022) and What teammates
 * see (L2-034), saved through the bar for unsaved changes (L2-035). The postal code shown is the
 * viewer's own, the only one any screen shows after joining. Leaving the team joins with journey 24.
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
    Segmented,
    SelectField,
    Skeleton,
    Switch,
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

  protected readonly temperatureUnits: SegmentedOption[] = [
    { value: 'celsius', label: '°C' },
    { value: 'fahrenheit', label: '°F' },
  ];
  protected readonly clockFormats: SegmentedOption[] = [
    { value: '24-hour', label: '24-hour' },
    { value: '12-hour', label: '12-hour' },
  ];

  /** The kinds' switches, in their fixed order (L2-022). */
  protected readonly kindSwitches: readonly { kind: MomentKind; label: string }[] = [
    { kind: 'holiday', label: 'Public holidays' },
    { kind: 'formula-1', label: 'Formula 1 race weekends' },
    { kind: 'local-event', label: 'Local events and festivals' },
    { kind: 'sport', label: 'Big sporting days' },
  ];

  /** What each sharing switch's state means for teammates (L2-034). */
  protected readonly weatherHint = computed(() =>
    this.store.settings()?.sharesWeather
      ? 'Shown on your pin and in your panel.'
      : 'Teammates see your local time and no weather.',
  );
  protected readonly statusHint = computed(() =>
    this.store.settings()?.sharesStatus
      ? 'Worked out from your local time — 09:00 to 18:00 counts as working.'
      : 'Teammates see no status for you, at any hour.',
  );

  /** Both switches off in the draft: teammates will see only the name, city and local time. */
  protected readonly sharesNothing = computed(() => {
    const settings = this.store.settings();
    return !!settings && !settings.sharesWeather && !settings.sharesStatus;
  });

  /** Either switch off as saved: the viewer still sees what teammates do not. */
  protected readonly withholds = computed(() => {
    const settings = this.store.profile()?.settings;
    return !!settings && (!settings.sharesWeather || !settings.sharesStatus);
  });

  /** The country chosen in the draft, with the form its postal codes take. */
  protected readonly country = computed(
    () => supportedCountries.find((country) => country.code === this.store.countryCode()) ?? null,
  );

  /** "Milan, Italy". */
  protected readonly place = computed(() => {
    const pin = this.store.profile()?.pin;
    return pin ? `${pin.cityName}, ${pin.country}` : '';
  });

  /** "15:05 local · Central European Time", on the saved clock, ticking with the one clock. */
  protected readonly time = computed(() => {
    const profile = this.store.profile();
    if (!profile) return '';
    const pin = profile.pin;
    this.clock.minute();
    const now = untracked(() => this.clock.now());
    const time = formatTime(localTime(now, pin.timeZoneId), profile.settings.clockFormat);
    return `${time} local · ${timeZoneName(pin.timeZoneId, now)}`;
  });

  /** The city a found postal code lies in, not saved yet. */
  private readonly found = computed(() => {
    const lookup = this.store.lookup();
    return lookup.kind === 'Found' && this.store.locationChanged() ? lookup.result.city : null;
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

  protected chooseTemperatureUnit(value: string): void {
    this.store.setTemperatureUnit(value as TemperatureUnit);
  }

  protected chooseClockFormat(value: string): void {
    this.store.setClockFormat(value as ClockFormat);
  }

  protected tryAgain(): void {
    void this.store.load();
  }

  /** Saves what changed; when the pin moved, the team is read again so every screen shows it there. */
  protected async save(): Promise<void> {
    if (await this.store.save()) void this.team.load();
  }
}

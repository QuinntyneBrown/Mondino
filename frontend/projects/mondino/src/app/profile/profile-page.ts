import {
  ChangeDetectionStrategy,
  Component,
  computed,
  createEnvironmentInjector,
  DestroyRef,
  DOCUMENT,
  effect,
  EnvironmentInjector,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import type { Dialog } from '@angular/cdk/dialog';
import type { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
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
 * viewer's own, the only one any screen shows after joining. "Leave Northwind" opens
 * "Leave Northwind?" (L2-036), before and instead of "Leave without saving?".
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
  // The screen's state and its client, released with it; the clock is the shell's (ADR 0025).
  providers: [ProfileStore, { provide: PROFILE_API, useClass: HttpProfileApi }],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly store = inject(ProfileStore);
  private readonly team = inject(TeamStore);
  private readonly clock = inject(CLOCK);
  private readonly injector = inject(Injector);
  private readonly environment = inject(EnvironmentInjector);
  /** The CDK Dialog, imported when a dialog is first opened; it goes with the screen. */
  private dialogs: { readonly service: Dialog; readonly injector: EnvironmentInjector } | null =
    null;
  private asking: Promise<boolean> | null = null;
  private leaveDialog: { close(): void } | null = null;
  private leaveDialogOpen = false;
  private destroyed = false;

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

  /** "Leave Northwind", the team's name as text. */
  protected readonly leaveLabel = computed(() => `Leave ${this.store.profile()?.teamName ?? ''}`);

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
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      // "Leave Northwind?" goes with the screen it was asked on, as once the team is left.
      this.leaveDialog?.close();
      // Destroying the dialogs' injector closes a dialog still open.
      this.dialogs?.injector.destroy();
    });

    // While there are unsaved changes, the browser asks before a reload or a closed tab, with its
    // own confirmation (L2-035). The listener goes when they are saved or undone, and with the screen.
    const window = inject(DOCUMENT).defaultView;
    effect((onCleanup) => {
      if (!window || !this.store.hasUnsavedChanges()) return;
      const ask = (event: BeforeUnloadEvent): void => event.preventDefault();
      window.addEventListener('beforeunload', ask);
      onCleanup(() => window.removeEventListener('beforeunload', ask));
    });
  }

  /**
   * Whether the screen may be left (L2-035): at once with nothing unsaved; otherwise when
   * "Leave without saving?" is answered "Discard and leave". One question at a time.
   */
  canLeave(): boolean | Promise<boolean> {
    if (!this.store.hasUnsavedChanges()) return true;
    this.asking ??= this.ask().finally(() => (this.asking = null));
    return this.asking;
  }

  private async ask(): Promise<boolean> {
    const [
      { Dialog, OVERLAY_DEFAULT_CONFIG },
      { DiscardChangesDialog, discardChangesTitleId, discardChangesDescriptionId },
    ] = await Promise.all([
      import('../team/invite-dialog/dialog-layers'),
      import('./discard-changes-dialog/discard-changes-dialog'),
    ]);
    if (this.destroyed) return true;
    const dialog = this.dialogService(Dialog, OVERLAY_DEFAULT_CONFIG).open<boolean>(
      DiscardChangesDialog,
      {
        injector: this.injector,
        role: 'alertdialog',
        ariaModal: true,
        ariaLabelledBy: discardChangesTitleId,
        ariaDescribedBy: discardChangesDescriptionId,
        autoFocus: '.btn--primary',
        hasBackdrop: false,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
      },
    );
    return new Promise((answer) => dialog.closed.subscribe((leave) => answer(leave === true)));
  }

  /**
   * "Leave Northwind" opens "Leave Northwind?" (L2-036) at once, whatever is unsaved: leaving takes
   * the settings too. Focus starts on "Stay" and returns to the button. One dialog at a time.
   */
  protected async openLeaveDialog(event: Event): Promise<void> {
    const trigger = event.currentTarget as HTMLElement;
    if (this.leaveDialogOpen) return;
    this.leaveDialogOpen = true;
    const [
      { Dialog, OVERLAY_DEFAULT_CONFIG },
      { LeaveTeamDialog, leaveTeamTitleId, leaveTeamDescriptionId },
    ] = await Promise.all([
      import('../team/invite-dialog/dialog-layers'),
      import('./leave-team-dialog/leave-team-dialog'),
    ]);
    if (this.destroyed) return;
    const dialog = this.dialogService(Dialog, OVERLAY_DEFAULT_CONFIG).open(LeaveTeamDialog, {
      injector: this.injector,
      role: 'alertdialog',
      ariaModal: true,
      ariaLabelledBy: leaveTeamTitleId,
      ariaDescribedBy: leaveTeamDescriptionId,
      autoFocus: '.dialog__footer .btn:first-child',
      restoreFocus: trigger,
      hasBackdrop: false,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
    });
    this.leaveDialog = dialog;
    dialog.closed.subscribe(() => {
      this.leaveDialog = null;
      this.leaveDialogOpen = false;
    });
  }

  /** The screen's CDK Dialog, drawn in the page's own layers, made on first use. */
  private dialogService(
    dialog: typeof Dialog,
    overlayDefaults: typeof OVERLAY_DEFAULT_CONFIG,
  ): Dialog {
    if (!this.dialogs) {
      const injector = createEnvironmentInjector(
        [dialog, { provide: overlayDefaults, useValue: { usePopover: false } }],
        this.environment,
      );
      this.dialogs = { service: injector.get(dialog), injector };
    }
    return this.dialogs.service;
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

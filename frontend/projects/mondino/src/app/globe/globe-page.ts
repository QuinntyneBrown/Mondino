import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CLOCK,
  SETTINGS_STORE,
  TEAM_MEMBERSHIP,
  type GlobeViewport,
  type PinPlacement,
  type Position,
} from '@mondino/api';
import {
  GlobeFallback,
  GlobeLegend,
  GlobePlaceholder,
  GroupPanel,
  PinLayer,
  InviteCard,
  TeammatePanel,
  WeekPanel,
} from '@mondino/components';
import { GlobeView, type GlobeState } from '@mondino/globe';
import {
  BrowserClock,
  countsWords,
  defaultClockFormat,
  defaultTemperatureUnit,
  groupCities,
  ofKinds,
  pinViews,
  placePins,
  stillViewport,
  teammatePanelView,
  teamCounts,
  weekMoments,
  workingNow,
} from '@mondino/domain';
import type { JustJoined } from './just-joined';
import { InviteLinkCopier } from '../team/invite-link-copier';
import { TeamStore } from '../team/team-store';
import { Toaster } from '../team/toaster';

/**
 * Globe, the home screen: the 3D globe (L2-008, L2-010), or the still picture where it cannot be
 * drawn, with the team's pins over it (L2-011 to L2-013, ADR 0014). Selecting a pin turns the
 * globe to it and holds (L2-009). Straight after joining (L2-005) the new teammate's pin is
 * selected, lifted, labelled and pulsing once, with a toast that says they are on the map. The
 * counts and the panel join with journeys 11 to 15.
 */
@Component({
  selector: 'mo-globe-page',
  imports: [
    GlobeFallback,
    GlobeLegend,
    GlobePlaceholder,
    GlobeView,
    GroupPanel,
    PinLayer,
    InviteCard,
    TeammatePanel,
    WeekPanel,
  ],
  // One clock for the screen, released with it; the team is the shell's.
  providers: [{ provide: CLOCK, useClass: BrowserClock }],
  templateUrl: './globe-page.html',
  styleUrl: './globe-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'escape()' },
})
export class GlobePage {
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(TeamStore);
  private readonly toaster = inject(Toaster);
  private readonly copier = inject(InviteLinkCopier);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  /** Whether the open panel was opened from the keyboard: it then takes focus, and gives it back. */
  private openedFromKeyboard = false;

  /**
   * The teammate the address selects: `/globe?teammate={teammateId}`, an opaque id and nothing
   * else (L2-023). The address is the source of the selection; the store follows it.
   */
  private readonly requestedId = signal<string | null>(null);

  /** The teammate who has just joined, from the navigation that opened the screen; null on a reload. */
  protected readonly justJoined = justJoinedIn(
    // The screen is drawn in the shell's outlet once the navigation has ended, so its state is the
    // last successful navigation's.
    (inject(Router).currentNavigation() ?? inject(Router).lastSuccessfulNavigation())?.extras
      .state?.['justJoined'],
  );

  /** Whether the 3D globe is loading, drawn, or cannot be drawn and the still picture is shown. */
  protected readonly globeState = signal<GlobeState>('Loading');

  /** Where things are on the 3D globe, as it last reported; and the still picture's width. */
  private readonly viewport = signal<GlobeViewport | null>(null);
  protected readonly stillWidth = signal(0);

  /**
   * What each pin shows, its local time and status among it, worked out in one pass each time the
   * one clock's minute changes (L2-014, L2-015), with the weather (L2-018). Times are on the
   * viewer's clock and temperatures in their unit, as saved on Profile & Settings (L2-019, L2-033);
   * until a profile has been read in this browser, the defaults for the country of their pin.
   */
  private readonly settings = inject(SETTINGS_STORE);
  private readonly viewer = computed(() => this.store.team()?.pins.find((pin) => pin.isViewer));
  protected readonly clockFormat = computed(
    () => this.settings.clockFormat() ?? defaultClockFormat(this.viewer()?.country ?? ''),
  );
  private readonly unit = computed(
    () => this.settings.temperatureUnit() ?? defaultTemperatureUnit(this.viewer()?.country ?? ''),
  );

  /** The kinds of moment the viewer chose to see on the globe and in the week (L2-022). */
  protected readonly kinds = this.settings.momentKinds;
  protected readonly everyKindOff = computed(() => this.kinds().length === 0);

  private readonly views = computed(() => {
    this.clock.minute();
    const team = this.store.team();
    if (!team) return null;
    return pinViews(
      team.pins,
      untracked(() => this.clock.now()),
      this.justJoined?.teammateId ?? null,
      this.clockFormat(),
      this.unit(),
      this.store.moments(),
      this.kinds(),
    );
  });

  /**
   * The heading over the globe (L2-025): "13 teammates" and "12 time zones · 8 working · 2 asleep",
   * worked out again as the one clock's minute changes, so a count follows an hour that changes a
   * status with no reload.
   */
  protected readonly heading = computed(() => {
    this.clock.minute();
    const team = this.store.team();
    if (!team) return null;
    if (this.teamOfOne())
      return { title: 'Just you, for now', line: 'Invite your team to fill the map' };
    return countsWords(
      teamCounts(
        team.pins,
        untracked(() => this.clock.now()),
      ),
    );
  });

  /**
   * The selected teammate's panel (L2-023), worked out again as the one clock's minute changes,
   * so its local time, status, offset and overlap move with it; null with no teammate selected.
   */
  protected readonly panel = computed(() => {
    this.clock.minute();
    const id = this.store.selectedId();
    const pin = this.store.team()?.pins.find((each) => each.teammateId === id);
    if (!pin) return null;
    return teammatePanelView(
      pin,
      this.viewer(),
      untracked(() => this.clock.now()),
      this.clockFormat(),
      this.unit(),
      this.store.moments(),
    );
  });

  private placementsIn(viewport: GlobeViewport | null): readonly PinPlacement[] | null {
    const team = this.store.team();
    const views = this.views();
    if (!team || !views || !viewport || viewport.widthPx <= 0) return null;
    return placePins(team.pins, views, viewport, {
      selectedId: this.store.selectedId(),
      heldIds: this.store.heldIds(),
    });
  }

  /** The pins over the 3D globe, placed again on each frame it reports. */
  protected readonly placements = computed(() => this.placementsIn(this.viewport()));
  /** The pins over the still picture. */
  protected readonly stillPinPlacements = computed(() =>
    this.placementsIn(stillViewport(this.stillWidth())),
  );

  /** The selected pin's position, or the selected group pin's anchor: the globe turns to it. */
  protected readonly facing = computed<Position | null>(() => {
    const id = this.store.selectedId() ?? this.store.heldIds()[0];
    return this.store.team()?.pins.find((pin) => pin.teammateId === id)?.position ?? null;
  });

  protected readonly globeLabel = computed(() => {
    const count = this.store.team()?.pins.length;
    const pins =
      count === undefined
        ? ''
        : this.teamOfOne()
          ? ', with your pin'
          : `, with ${count} ${count === 1 ? 'teammate’s pin' : 'teammates’ pins'}`;
    return this.globeState() === 'Fallback'
      ? `A still picture of the globe${pins}.`
      : `The globe${pins}`;
  });

  /**
   * A selected group pin's panel (L2-023): its teammates city by city, each city's local time
   * moving with the minute; null with no group selected, or once one teammate or none is left.
   */
  protected readonly group = computed(() => {
    this.clock.minute();
    const ids = this.store.heldIds();
    const team = this.store.team();
    if (ids.length === 0 || !team) return null;
    const content = groupCities(
      team.pins,
      ids,
      untracked(() => this.clock.now()),
      this.clockFormat(),
    );
    return content.cities.reduce((total, city) => total + city.rows.length, 0) > 1 ? content : null;
  });

  /** A team whose only teammate is the viewer: the invite card takes the panel's place (L2-025). */
  protected readonly teamOfOne = computed(() => {
    const pins = this.store.team()?.pins;
    return pins?.length === 1 && pins[0].isViewer;
  });

  /** The invite link as the card shows it: without its scheme. */
  protected readonly inviteLinkShown = computed(() =>
    this.store.team() ? this.copier.link().replace(/^https?:\/\//, '') : '',
  );

  /**
   * With no pin or group selected, who is in working hours now for the week's view (L2-024): six
   * at most, with their count, worked out again as the minute changes; null while a panel is open.
   */
  protected readonly week = computed(() => {
    this.clock.minute();
    const team = this.store.team();
    if (!team || this.teamOfOne()) return null;
    if (this.store.selectedId() !== null || this.store.heldIds().length > 0) return null;
    return workingNow(
      team.pins,
      untracked(() => this.clock.now()),
      this.clockFormat(),
      6,
    );
  });

  /**
   * This week's moments for the week's view (L2-024): six at most, of the kinds the viewer chose
   * (L2-022), from today to 7 days ahead in each place, worked out again as the minute changes;
   * none while a panel is open.
   */
  protected readonly momentsThisWeek = computed(() => {
    this.clock.minute();
    const team = this.store.team();
    if (!team || this.week() === null) return [];
    return weekMoments(
      ofKinds(this.store.moments(), this.kinds()),
      team.pins,
      untracked(() => this.clock.now()),
    );
  });

  /** The address that selects a teammate, which a group's rows link to. */
  protected readonly addressOf = (teammateId: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: { teammate: teammateId },
      }),
    );

  /** The panel as a list of one, so another teammate's is drawn afresh and fades in. */
  protected readonly panels = computed(() => {
    const panel = this.panel();
    return panel ? [panel] : [];
  });

  /**
   * What was selected, said once in a polite live region as the mocks word it: "Tomás Herrera,
   * Mexico City, selected.". It changes with the selection only, not as the minute passes.
   */
  protected readonly announcement = computed(() => {
    const id = this.store.selectedId();
    const pin = this.store.team()?.pins.find((each) => each.teammateId === id);
    if (pin) return `${pin.name}${pin.isViewer ? ', you' : ''}, ${pin.cityName}, selected.`;
    const group = this.group();
    return group ? `${group.title}.` : '';
  });

  constructor() {
    const router = this.router;
    const destroyRef = inject(DestroyRef);
    const subscription = this.route.queryParamMap.subscribe((params) =>
      this.requestedId.set(params.get('teammate')),
    );
    destroyRef.onDestroy(() => subscription.unsubscribe());
    // Once the pins are read, the address chooses the selected pin; an id that is no pin of the
    // team is taken out of the address. With no id a held group pin stays held.
    let joinedPending = this.justJoined?.teammateId ?? null;
    effect(() => {
      const team = this.store.team();
      const id = this.requestedId();
      if (!team) return;
      untracked(() => {
        if (joinedPending && id === null) {
          // The new pin stands alone, lifted and labelled, for this visit only: a reload of the
          // Globe greets no one, so it is not put in the address.
          this.store.select(joinedPending);
          joinedPending = null;
          return;
        }
        joinedPending = null;
        if (id === null) this.store.selectedId.set(null);
        else if (team.pins.some((pin) => pin.teammateId === id)) this.store.select(id);
        else this.show(null);
      });
    });
    // A team the session no longer has: the same address now says an invite link is needed.
    effect(() => {
      if (this.store.state() === 'Forgotten')
        void router.navigateByUrl(router.url, { onSameUrlNavigation: 'reload', replaceUrl: true });
    });

    const joined = this.justJoined;
    if (!joined) return;
    // Shown once: a reload or a return through history does not greet the teammate again.
    const location = inject(Location);
    const state = location.getState();
    location.replaceState(location.path(true), '', {
      ...(typeof state === 'object' ? state : {}),
      justJoined: null,
    });
    const teamName = this.membership.current()?.teamName ?? 'Your team';
    this.toaster.show({
      tone: 'success',
      strong: 'You’re on the map.',
      text: `${teamName} can now see your pin in ${joined.cityName}.`,
    });
  }

  /** Selects a teammate's pin through the address, or clears the selection. */
  private show(teammateId: string | null): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: teammateId ? { teammate: teammateId } : {},
      replaceUrl: true,
    });
  }

  /** Whether what was just chosen has keyboard focus: a pin, or a row of a group's panel. */
  private chosenByKeyboard(): boolean {
    const chosen = document.activeElement;
    return !!chosen && this.host.contains(chosen) && chosen.matches(':focus-visible');
  }

  protected select(teammateId: string): void {
    const keyboard = this.chosenByKeyboard();
    this.openedFromKeyboard = keyboard;
    void this.show(teammateId).then(() => {
      if (keyboard) afterNextRender(() => this.focusHeading(), { injector: this.injector });
    });
  }

  /** A tap off the pins: the selection is cleared and focus is left where it is. */
  protected clear(): void {
    this.openedFromKeyboard = false;
    this.store.clear();
    void this.show(null);
  }

  /** The close button or Escape: the panel closes, and focus returns to the pin if it came from it. */
  protected close(): void {
    const teammateId = this.store.selectedId() ?? this.store.heldIds()[0];
    const keyboard = this.openedFromKeyboard;
    this.clear();
    if (keyboard && teammateId)
      afterNextRender(() => this.focusPin(teammateId), { injector: this.injector });
  }

  protected escape(): void {
    if (this.store.selectedId() !== null || this.store.heldIds().length > 0) this.close();
  }

  private focusHeading(): void {
    this.host.querySelector<HTMLElement>('.globe-screen__panel h2')?.focus();
  }

  /** Focus on the pin, or the group pin, that stands for a teammate. */
  private focusPin(teammateId: string): void {
    const placements =
      (this.globeState() === 'Fallback' ? this.stillPinPlacements() : this.placements()) ?? [];
    const index = placements.findIndex((placement) =>
      placement.pins.some((pin) => pin.teammateId === teammateId),
    );
    this.host.querySelectorAll<HTMLElement>('.globe__pins button.pin')[index]?.focus();
  }

  protected showView(viewport: GlobeViewport): void {
    this.viewport.set(viewport);
  }

  protected selectGroup(placement: PinPlacement): void {
    const keyboard = this.chosenByKeyboard();
    this.openedFromKeyboard = keyboard;
    this.store.selectGroup(placement.pins.map((pin) => pin.teammateId));
    void this.show(null);
    if (keyboard) afterNextRender(() => this.focusHeading(), { injector: this.injector });
  }

  /** "All moments", "Choose moments" and "2 more on the Team page": the screens they lead to. */
  protected go(address: string): void {
    void this.router.navigateByUrl(address);
  }

  /**
   * "Copy" on the invite card: the link is copied with no dialog; where the browser refuses, the
   * link in the card is selected, as the alert says (L2-025).
   */
  protected async copy(card: InviteCard): Promise<void> {
    if (!(await this.copier.copy())) card.selectLink();
  }
}

/** The navigation state is data: it is read only when it has the shape of a `JustJoined`. */
function justJoinedIn(state: unknown): JustJoined | null {
  if (typeof state !== 'object' || state === null) return null;
  const { teammateId, name, cityName, position } = state as Record<string, unknown>;
  if (
    typeof teammateId !== 'string' ||
    typeof name !== 'string' ||
    typeof cityName !== 'string' ||
    typeof position !== 'object' ||
    position === null
  )
    return null;
  const { latitude, longitude } = position as Record<string, unknown>;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { teammateId, name, cityName, position: { latitude, longitude } };
}

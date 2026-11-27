import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CLOCK,
  HttpTeamApi,
  TEAM_API,
  TEAM_MEMBERSHIP,
  type GlobeViewport,
  type PinPlacement,
  type Position,
} from '@mondino/api';
import { GlobeFallback, GlobeLegend, GlobePlaceholder, PinLayer, Toast } from '@mondino/components';
import { GlobeView, type GlobeState } from '@mondino/globe';
import {
  BrowserClock,
  defaultClockFormat,
  defaultTemperatureUnit,
  pinViews,
  placePins,
  stillViewport,
} from '@mondino/domain';
import type { JustJoined } from './just-joined';
import { TeamStore } from './team-store';

/** How long the toast after joining stays before it goes by itself. */
export const toastLifetime = 4000;

/**
 * Globe, the home screen: the 3D globe (L2-008, L2-010), or the still picture where it cannot be
 * drawn, with the team's pins over it (L2-011 to L2-013, ADR 0014). Selecting a pin turns the
 * globe to it and holds (L2-009). Straight after joining (L2-005) the new teammate's pin is
 * selected, lifted, labelled and pulsing once, with a toast that says they are on the map. The
 * counts and the panel join with journeys 11 to 15.
 */
@Component({
  selector: 'mo-globe-page',
  imports: [GlobeFallback, GlobeLegend, GlobePlaceholder, GlobeView, PinLayer, Toast],
  // One clock and one team for the screen, released with it.
  providers: [
    { provide: CLOCK, useClass: BrowserClock },
    { provide: TEAM_API, useClass: HttpTeamApi },
    TeamStore,
  ],
  templateUrl: './globe-page.html',
  styleUrl: './globe-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobePage {
  private readonly membership = inject(TEAM_MEMBERSHIP);
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(TeamStore);

  /**
   * The teammate the address selects: `/globe?teammate={teammateId}`, an opaque id and nothing
   * else (L2-023). The address is the source of the selection; the store follows it.
   */
  private readonly requestedId = signal<string | null>(null);

  /** The teammate who has just joined, from the navigation that opened the screen; null on a reload. */
  protected readonly justJoined = justJoinedIn(
    inject(Router).currentNavigation()?.extras.state?.['justJoined'],
  );

  /** Whether the 3D globe is loading, drawn, or cannot be drawn and the still picture is shown. */
  protected readonly globeState = signal<GlobeState>('Loading');

  /** Where things are on the 3D globe, as it last reported; and the still picture's width. */
  private readonly viewport = signal<GlobeViewport | null>(null);
  protected readonly stillWidth = signal(0);

  /**
   * What each pin shows, its local time and status among it, worked out in one pass each time the
   * one clock's minute changes (L2-014, L2-015), with the weather (L2-018). Times are on the
   * viewer's clock and temperatures in their unit: until Profile & Settings stores a choice
   * (journey 23), the defaults for the country of their pin (L2-019).
   */
  private readonly views = computed(() => {
    this.clock.minute();
    const team = this.store.team();
    if (!team) return null;
    const viewer = team.pins.find((pin) => pin.isViewer);
    return pinViews(
      team.pins,
      untracked(() => this.clock.now()),
      this.justJoined?.teammateId ?? null,
      defaultClockFormat(viewer?.country ?? ''),
      defaultTemperatureUnit(viewer?.country ?? ''),
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
        : `, with ${count} ${count === 1 ? 'teammate’s pin' : 'teammates’ pins'}`;
    return this.globeState() === 'Fallback'
      ? `A still picture of the globe${pins}.`
      : `The globe${pins}`;
  });

  protected readonly toast = signal<{ strong: string; text: string } | null>(null);

  constructor() {
    const router = this.router;
    const destroyRef = inject(DestroyRef);
    const subscription = this.route.queryParamMap.subscribe((params) =>
      this.requestedId.set(params.get('teammate')),
    );
    destroyRef.onDestroy(() => subscription.unsubscribe());
    void this.store.load();
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
    this.toast.set({
      strong: 'You’re on the map.',
      text: `${teamName} can now see your pin in ${joined.cityName}.`,
    });
    const timer = setTimeout(() => this.toast.set(null), toastLifetime);
    destroyRef.onDestroy(() => clearTimeout(timer));
  }

  /** Selects a teammate's pin through the address, or clears the selection. */
  private show(teammateId: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: teammateId ? { teammate: teammateId } : {},
      replaceUrl: true,
    });
  }

  protected select(teammateId: string): void {
    this.show(teammateId);
  }

  protected clear(): void {
    this.store.clear();
    this.show(null);
  }

  protected showView(viewport: GlobeViewport): void {
    this.viewport.set(viewport);
  }

  protected selectGroup(placement: PinPlacement): void {
    this.store.selectGroup(placement.pins.map((pin) => pin.teammateId));
    this.show(null);
  }

  protected dismissToast(): void {
    this.toast.set(null);
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

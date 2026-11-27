import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { TEAM_MEMBERSHIP } from '@mondino/api';
import { GlobeFallback, Toast } from '@mondino/components';
import { stillPlacements } from '@mondino/domain';
import type { JustJoined } from './just-joined';

/** How long the toast after joining stays before it goes by itself. */
export const toastLifetime = 4000;

/**
 * Globe, the home screen. Journey 4 builds only the arrival after joining (L2-005): the new
 * teammate's pin on the still globe, lifted, labelled and pulsing once, and a toast that says they
 * are on the map. The 3D globe, the team's pins, the counts and the panel join with journeys 8 to 15.
 */
@Component({
  selector: 'mo-globe-page',
  imports: [GlobeFallback, Toast],
  templateUrl: './globe-page.html',
  styleUrl: './globe-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobePage {
  private readonly membership = inject(TEAM_MEMBERSHIP);

  /** The teammate who has just joined, from the navigation that opened the screen; null on a reload. */
  protected readonly justJoined = justJoinedIn(
    inject(Router).currentNavigation()?.extras.state?.['justJoined'],
  );

  protected readonly you = computed(() => {
    const joined = this.justJoined;
    if (!joined) return null;
    const [placement] = stillPlacements([joined.position]);
    return placement ? { ...placement, label: `${joined.name} (you) · ${joined.cityName}` } : null;
  });

  protected readonly globeLabel = this.justJoined
    ? `The globe, with your new pin in ${this.justJoined.cityName}`
    : 'The globe, with no pins';

  protected readonly toast = signal<{ strong: string; text: string } | null>(null);

  constructor() {
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
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
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

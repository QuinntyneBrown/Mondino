import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { CLOCK } from '@mondino/api';
import { TeamTable } from '@mondino/components';
import {
  BrowserClock,
  defaultClockFormat,
  defaultTemperatureUnit,
  teamCounts,
  teamLine,
  teamRows,
} from '@mondino/domain';
import { TeamStore } from '../team-store';

/**
 * Team, "Where everyone is in their day" (L2-026 to L2-028): everyone west to east with their
 * local time, offset and weather, worked out again as the one clock's minute changes. Times are on
 * the viewer's clock and temperatures in their unit: until Profile & Settings stores a choice
 * (journey 23), the defaults for the country of their pin (L2-019). A row opens the Globe with
 * that teammate selected.
 */
@Component({
  selector: 'mo-team-page',
  imports: [TeamTable],
  // One clock for the screen, released with it; the team is the shell's.
  providers: [{ provide: CLOCK, useClass: BrowserClock }],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {
  private readonly clock = inject(CLOCK);
  private readonly router = inject(Router);
  protected readonly store = inject(TeamStore);

  private readonly viewer = computed(() => this.store.team()?.pins.find((pin) => pin.isViewer));
  private readonly clockFormat = computed(() => defaultClockFormat(this.viewer()?.country ?? ''));
  private readonly unit = computed(() => defaultTemperatureUnit(this.viewer()?.country ?? ''));

  /** The pins with the minute they were worked out at, so every value below moves together. */
  private readonly now = computed(() => {
    this.clock.minute();
    return untracked(() => this.clock.now());
  });

  /** "13 teammates · 12 time zones · live". */
  protected readonly lead = computed(() => {
    const pins = this.store.team()?.pins;
    return pins ? teamLine(teamCounts(pins, this.now())) : null;
  });

  protected readonly rows = computed(() => {
    const pins = this.store.team()?.pins;
    return pins ? teamRows(pins, this.now(), this.clockFormat(), this.unit()) : [];
  });

  /** The address that selects a teammate on the Globe. */
  protected readonly addressOf = (teammateId: string): string =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/globe'], { queryParams: { teammate: teammateId } }),
    );

  constructor() {
    // A team the session no longer has: the same address now says an invite link is needed.
    effect(() => {
      if (this.store.state() === 'Forgotten')
        void this.router.navigateByUrl(this.router.url, {
          onSameUrlNavigation: 'reload',
          replaceUrl: true,
        });
    });
  }

  protected choose(teammateId: string): void {
    void this.router.navigateByUrl(this.addressOf(teammateId));
  }
}

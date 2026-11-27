import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CLIPBOARD, CLOCK, HttpTeamApi, SETTINGS_STORE, TEAM_API } from '@mondino/api';
import { AppHeader, Avatar, Banner, Toast } from '@mondino/components';
import {
  BrowserClock,
  defaultClockFormat,
  formatTime,
  initialsOf,
  localTime,
  NavigatorClipboard,
  SettingsCache,
} from '@mondino/domain';
import { InviteDialogOpener } from './invite-dialog-opener';
import { InviteLinkCopier } from './invite-link-copier';
import { TeamStore } from './team-store';
import { Toaster } from './toaster';

/**
 * The teammate screens' shell: the header the mocks draw over Globe, Team, Moments and Profile &
 * Settings, the screen under it, and the team they share, read once and released when the
 * teammate leaves them (view-week-around-the-world). Globe, Team, Moments and Profile & Settings
 * are its children; "Invite teammate" opens the invite dialog.
 */
@Component({
  selector: 'mo-team-shell',
  imports: [AppHeader, Avatar, Banner, RouterLink, RouterOutlet, Toast],
  providers: [
    { provide: TEAM_API, useClass: HttpTeamApi },
    // One clock for the four screens and the team's refresh, released with them (ADR 0025).
    { provide: CLOCK, useClass: BrowserClock },
    { provide: CLIPBOARD, useClass: NavigatorClipboard },
    // The viewer's chosen kinds of moment, read where the teammate screens are (ADR 0020).
    { provide: SETTINGS_STORE, useClass: SettingsCache },
    TeamStore,
    Toaster,
    InviteLinkCopier,
    InviteDialogOpener,
  ],
  templateUrl: './team-shell.html',
  styleUrl: './team-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamShell {
  private readonly router = inject(Router);
  protected readonly store = inject(TeamStore);
  protected readonly toaster = inject(Toaster);
  private readonly inviteDialog = inject(InviteDialogOpener);
  private readonly settings = inject(SETTINGS_STORE);

  /** The screens in the header, in the mocks' order. */
  protected readonly navigation = [
    { path: '/globe', label: 'Globe' },
    { path: '/team', label: 'Team' },
    { path: '/moments', label: 'Moments' },
  ];

  /**
   * The screen shown, by its path, which the header marks `aria-current="page"`. It is read from
   * the router's navigations rather than with `RouterLinkActive`, which costs the initial bundle
   * 10 kB.
   */
  protected readonly screen = signal(pathOf(this.router.url));

  /** The viewer's own pin, whose initials and colour the link to Profile & Settings shows. */
  protected readonly viewer = computed(() => {
    const pin = this.store.team()?.pins.find((each) => each.isViewer);
    return pin ? { initials: initialsOf(pin.name), colour: pin.colour } : null;
  });

  /**
   * While a refresh has failed, the banner under the header (L2-048, L2-049): what is still true,
   * and the time the rest was read on the viewer's clock. Team shows no list of moments, so it
   * names the weather alone.
   */
  protected readonly banner = computed(() => {
    const readAt = this.store.refreshedAt();
    const viewer = this.store.team()?.pins.find((pin) => pin.isViewer);
    if (!this.store.refreshFailed() || readAt === null || !viewer) return null;
    const format = this.settings.clockFormat() ?? defaultClockFormat(viewer.country);
    const what = this.screen() === '/team' ? 'weather is' : 'weather and moments are';
    return {
      text: `Couldn’t refresh. Clocks are live; ${what} from`,
      time: formatTime(localTime(readAt, viewer.timeZoneId), format),
    };
  });

  constructor() {
    void this.store.load();
    const subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.screen.set(pathOf(event.urlAfterRedirects));
    });
    const destroyed = inject(DestroyRef);
    destroyed.onDestroy(() => subscription.unsubscribe());

    // The toast regions are children of the body, as the invite dialog is: an open dialog hides
    // the rest of the page from assistive technology, but not a live region beside it, so a toast
    // over the dialog is still announced (L2-054). They go with the shell.
    const host: HTMLElement = inject(ElementRef).nativeElement;
    afterNextRender(() => {
      const regions = [...host.querySelectorAll<HTMLElement>(':scope > .toast-region')];
      host.ownerDocument.body.append(...regions);
      destroyed.onDestroy(() => regions.forEach((region) => region.remove()));
    });
  }

  protected goHome(): void {
    void this.router.navigateByUrl('/globe');
  }

  /**
   * "Invite teammate" opens the invite dialog (invite-teammates, L2-054); nothing is copied until
   * its "Copy link" is used (L2-025).
   */
  protected invite(trigger: HTMLElement): void {
    void this.inviteDialog.open(trigger);
  }
}

/** An address's path, without its query string or fragment: "/globe". */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}

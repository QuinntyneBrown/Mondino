import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button, NoticePage } from '@mondino/components';

/**
 * Left Team (L2-036): "You’ve left Northwind", shown once a teammate has left, with no app header
 * and two ways on: Create Team and Sign In. It reads nothing from the backend. The team's name
 * comes in the navigation state from Profile & Settings and is rendered as text; it is read once
 * and taken out of history, so the browser keeps nothing of the team, and the screen opened or
 * reloaded without it says "the team".
 */
@Component({
  selector: 'mo-left-page',
  imports: [Button, NoticePage, RouterLink],
  templateUrl: './left-page.html',
  styleUrl: './left-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPage {
  private readonly teamName = teamNameIn(
    inject(Router).currentNavigation()?.extras.state?.['teamName'],
  );

  protected readonly title = this.teamName
    ? `You’ve left ${this.teamName}`
    : 'You’ve left the team';
  protected readonly text = `Your pin is off ${
    this.teamName ? `${this.teamName}’s` : 'the team’s'
  } globe and they can no longer see your time, weather or moments. To come back, ask a teammate for the team’s invite link.`;

  constructor() {
    const location = inject(Location);
    const state = location.getState();
    if (typeof state === 'object' && state !== null && 'teamName' in state)
      location.replaceState(location.path(true), '', { ...state, teamName: null });
  }
}

/** The navigation state is data: a team's name is read only when it is a short string. */
function teamNameIn(state: unknown): string | null {
  return typeof state === 'string' && state.length > 0 && state.length <= 60 ? state : null;
}

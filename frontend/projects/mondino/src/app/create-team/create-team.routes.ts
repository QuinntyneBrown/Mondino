import { Routes } from '@angular/router';
import { CLIPBOARD, HttpTeamCreationApi, TEAM_CREATION_API } from '@mondino/api';
import { NavigatorClipboard } from '@mondino/domain';

// Create Team binds its API and the clipboard itself, so their code stays out of the initial
// bundle and loads with the screen.
export const createTeamRoutes: Routes = [
  {
    path: '',
    title: 'Create Team · Mondino',
    providers: [
      { provide: TEAM_CREATION_API, useClass: HttpTeamCreationApi },
      { provide: CLIPBOARD, useClass: NavigatorClipboard },
    ],
    loadComponent: () => import('./create-team-page').then((m) => m.CreateTeamPage),
  },
];

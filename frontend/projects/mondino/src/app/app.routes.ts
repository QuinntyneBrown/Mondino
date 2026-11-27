import { Routes } from '@angular/router';
import { teammateGuard } from './membership/teammate-guard';

// Every route is lazy. A screen joins this list with the journey that builds it.
export const routes: Routes = [
  {
    path: 'join/:inviteToken',
    loadChildren: () => import('./join/join.routes').then((m) => m.joinRoutes),
  },
  {
    path: 'new',
    loadChildren: () => import('./create-team/create-team.routes').then((m) => m.createTeamRoutes),
  },
  {
    path: 'globe',
    title: 'Globe · Mondino',
    canMatch: [teammateGuard],
    loadComponent: () => import('./globe/globe-page').then((m) => m.GlobePage),
  },
  // Someone on no team who opens a team's screen is told, in place, that an invite link is needed.
  ...['globe', 'team', 'moments', 'profile'].map((path) => ({
    path,
    title: 'You need an invite link · Mondino',
    loadComponent: () =>
      import('./invite-needed/invite-needed-page').then((m) => m.InviteNeededPage),
  })),
  {
    path: '**',
    title: 'Page not found · Mondino',
    loadComponent: () => import('./not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];

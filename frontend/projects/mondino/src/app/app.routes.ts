import { Routes } from '@angular/router';
import { teammateGuard } from './membership/teammate-guard';

// Every route is lazy. A screen joins this list with the journey that builds it.
export const routes: Routes = [
  // The site's own address is the Globe's: a teammate sees the team, anyone else the invite notice.
  { path: '', pathMatch: 'full', redirectTo: 'globe' },
  {
    path: 'join/:inviteToken',
    loadChildren: () => import('./join/join.routes').then((m) => m.joinRoutes),
  },
  {
    path: 'new',
    loadChildren: () => import('./create-team/create-team.routes').then((m) => m.createTeamRoutes),
  },
  {
    path: 'sign-in',
    loadChildren: () => import('./sign-in/sign-in.routes').then((m) => m.signInRoutes),
  },
  // The teammate screens, under one shell that holds the header and the team they share. An
  // address the shell has no screen for yet falls through to the routes after it.
  {
    path: '',
    canMatch: [teammateGuard],
    loadComponent: () => import('./team/team-shell').then((m) => m.TeamShell),
    children: [
      {
        path: 'globe',
        title: 'Globe · Mondino',
        loadComponent: () => import('./globe/globe-page').then((m) => m.GlobePage),
      },
      {
        path: 'team',
        title: 'Team · Mondino',
        loadComponent: () => import('./team/team-page/team-page').then((m) => m.TeamPage),
      },
      {
        path: 'moments',
        title: 'Moments · Mondino',
        loadComponent: () => import('./moments/moments-page').then((m) => m.MomentsPage),
      },
    ],
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

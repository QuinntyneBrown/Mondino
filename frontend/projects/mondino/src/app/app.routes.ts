import { Routes } from '@angular/router';

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
    loadComponent: () => import('./globe/globe-page').then((m) => m.GlobePage),
  },
  {
    path: '**',
    title: 'Page not found · Mondino',
    loadComponent: () => import('./not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];

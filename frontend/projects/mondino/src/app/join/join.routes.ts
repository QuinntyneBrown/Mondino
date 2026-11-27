import { Routes } from '@angular/router';
import { HttpInviteApi, INVITE_API } from '@mondino/api';

// Join binds the invite API itself, so its code stays out of the initial bundle and loads with
// the screen.
export const joinRoutes: Routes = [
  {
    path: '',
    title: 'Join · Mondino',
    providers: [{ provide: INVITE_API, useClass: HttpInviteApi }],
    loadComponent: () => import('./join-page').then((m) => m.JoinPage),
  },
];

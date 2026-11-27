import { Routes } from '@angular/router';

// Every route is lazy. A screen joins this list with the journey that builds it.
export const routes: Routes = [
  {
    path: '**',
    title: 'Page not found · Mondino',
    loadComponent: () => import('./not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];

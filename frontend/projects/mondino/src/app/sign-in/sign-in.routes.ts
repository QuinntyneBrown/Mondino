import { Routes } from '@angular/router';
import { HttpSignInApi, SIGN_IN_API } from '@mondino/api';

// Sign In binds its API itself, so its code stays out of the initial bundle and loads with the screen.
export const signInRoutes: Routes = [
  {
    path: '',
    title: 'Sign In · Mondino',
    providers: [{ provide: SIGN_IN_API, useClass: HttpSignInApi }],
    loadComponent: () => import('./sign-in-page').then((m) => m.SignInPage),
  },
];

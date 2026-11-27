import type { CanDeactivateFn, Routes } from '@angular/router';
import { ProfilePage } from './profile-page';

/**
 * Leaving Profile & Settings with unsaved changes asks first (L2-035): by a tab in the header, the
 * wordmark or the browser's back button. The page decides, through "Leave without saving?".
 */
export const unsavedChangesGuard: CanDeactivateFn<ProfilePage> = (page) => page.canLeave();

/** Profile & Settings, with the guard in its own chunk. */
export const profileRoutes: Routes = [
  {
    path: '',
    title: 'Profile & Settings · Mondino',
    component: ProfilePage,
    canDeactivate: [unsavedChangesGuard],
  },
];

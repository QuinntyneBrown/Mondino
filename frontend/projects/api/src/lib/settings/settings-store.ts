import { InjectionToken, type Signal } from '@angular/core';
import type { MomentKind } from '../moments/moment';

/**
 * The viewer's own settings, as the teammate screens read them (ADR 0020). For now, the kinds of
 * moment they chose to mark pins on the globe and fill "This week around the world" (L2-022): all
 * four to begin with. The choice is the viewer's alone, and changes nothing for anyone else.
 */
export interface SettingsStore {
  readonly momentKinds: Signal<readonly MomentKind[]>;
}

export const SETTINGS_STORE = new InjectionToken<SettingsStore>('SettingsStore');

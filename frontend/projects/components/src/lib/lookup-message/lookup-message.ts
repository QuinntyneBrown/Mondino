import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { Country, FoundWeather, LookupState } from '@mondino/api';

type Shown = 'Private' | 'Locating' | 'Found' | 'NotFound' | 'Nothing';

/**
 * Whose words the line uses: Join's and Create Team's, or Profile & Settings', where a teammate
 * moves a pin they already have (L2-032).
 */
export type LookupMode = 'Join' | 'Move';

/**
 * What the postal code lookup says, under the country and the postal code, in a polite live
 * region: the privacy promise, "Finding 20121…", the city found, or, as an alert, a postal code
 * that cannot be found with the form its country's postal codes take. It says nothing while the
 * lookup is down or rate limited, or when `quiet` (the postal code field shows its own error).
 * The postal code, the city and the form are rendered as text. The found line carries the
 * weather at the city when there is any: "13° and foggy right now." (L2-003).
 * In `Move` mode it says nothing while idle, names the country while finding ("Finding M5V 2T6 in
 * Canada…"), says the pin moves on saving ("Toronto, Canada. Your pin moves here when you save."),
 * with no weather, and ends a postal code that cannot be found with "Your pin stays in Milan."
 */
@Component({
  selector: 'mo-lookup-message',
  templateUrl: './lookup-message.html',
  styleUrl: './lookup-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LookupMessage {
  /** The message's id, which the postal code field names as its description. */
  readonly messageId = input.required<string>();
  readonly state = input<LookupState>({ kind: 'Idle' });
  /** The chosen country, whose form a postal code that cannot be found is told. */
  readonly country = input<Country | null>(null);
  readonly quiet = input(false, { transform: booleanAttribute });
  /** The weather at the city found, in the page's unit; none leaves it out, never a zero. */
  readonly weather = input<FoundWeather | null>(null);
  readonly mode = input<LookupMode>('Join');
  /** In `Move` mode, the city the pin stays in until a new one is saved: "Milan". */
  readonly stays = input('');

  protected readonly shown = computed<Shown>(() => {
    if (this.quiet()) return 'Nothing';
    switch (this.state().kind) {
      case 'Idle':
        return this.mode() === 'Move' ? 'Nothing' : 'Private';
      case 'Locating':
        return 'Locating';
      case 'Found':
        return 'Found';
      case 'NotFound':
        return 'NotFound';
      default:
        return 'Nothing';
    }
  });

  protected readonly postalCode = computed(() => {
    const state = this.state();
    return state.kind === 'Locating' || state.kind === 'NotFound' ? state.postalCode.trim() : '';
  });

  /** What is being found: "20121", or on Profile & Settings "M5V 2T6 in Canada". */
  protected readonly finding = computed(() => {
    const country = this.country();
    return this.mode() === 'Move' && country
      ? `${this.postalCode()} in ${country.nameInText}`
      : this.postalCode();
  });

  /** The city found and its country, as Profile & Settings names it: "Toronto, Canada." */
  protected readonly cityAndCountry = computed(() => {
    const state = this.state();
    if (state.kind !== 'Found') return '';
    const country = this.country();
    return country ? `${state.result.city.name}, ${country.name}.` : `${state.result.city.name}.`;
  });

  protected readonly cityAndRegion = computed(() => {
    const state = this.state();
    if (state.kind !== 'Found') return '';
    const { name, region } = state.result.city;
    return region ? `${name}, ${region}` : name;
  });

  protected readonly notFound = computed(() => {
    const country = this.country();
    const where = country ? ` in ${country.nameInText}` : '';
    const form = country ? ` ${country.postalCodeForm}` : '';
    const stays =
      this.mode() === 'Move' && this.stays() ? ` Your pin stays in ${this.stays()}.` : '';
    return `We couldn’t find “${this.postalCode()}”${where}.${form}${stays}`;
  });
}

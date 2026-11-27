import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { Country, LookupState } from '@mondino/api';

type Shown = 'Private' | 'Locating' | 'Found' | 'NotFound' | 'Nothing';

/**
 * What the postal code lookup says, under the country and the postal code, in a polite live
 * region: the privacy promise, "Finding 20121…", the city found, or, as an alert, a postal code
 * that cannot be found with the form its country's postal codes take. It says nothing while the
 * lookup is down or rate limited, or when `quiet` (the postal code field shows its own error).
 * The postal code, the city and the form are rendered as text. The weather joins the found line
 * with journey 13.
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

  protected readonly shown = computed<Shown>(() => {
    if (this.quiet()) return 'Nothing';
    switch (this.state().kind) {
      case 'Idle':
        return 'Private';
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
    return `We couldn’t find “${this.postalCode()}”${where}.${form}`;
  });
}

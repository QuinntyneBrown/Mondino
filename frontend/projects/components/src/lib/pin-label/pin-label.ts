import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { LabelSide, PinView } from '@mondino/api';
import { MomentIcon } from '../moment-icon/moment-icon';
import { WeatherIcon } from '../weather-icon/weather-icon';

/**
 * The label beside a pin (L2-011, L2-012, L2-018): at rest its local time, the weather's icon and
 * the degrees; lifted, the teammate's name and city above them and the weather's word after, then
 * the nearest moment this week, "Día de Muertos · In 5 days" (L2-021). With
 * no weather to show, the local time alone. It sits on the side it is given, and is hidden from assistive technology:
 * the pin's button names the teammate. Everything in it is text (L2-044).
 */
@Component({
  selector: 'mo-pin-label',
  imports: [MomentIcon, WeatherIcon],
  templateUrl: './pin-label.html',
  styleUrl: './pin-label.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pin-label',
    'aria-hidden': 'true',
    '[class.pin-label--lifted]': 'lifted()',
    '[class.pin-label--right]': "side() === 'right'",
    '[class.pin-label--left]': "side() === 'left'",
    '[class.pin-label--below]': "side() === 'below'",
    '[class.pin-label--above]': "side() === 'above'",
  },
})
export class PinLabel {
  readonly pin = input.required<PinView>();
  readonly side = input<LabelSide>('right');
  readonly lifted = input(false, { transform: booleanAttribute });

  /** The lifted label's first line: "Lena Fischer · Berlin". */
  protected readonly nameAndCity = computed(() => `${this.pin().name} · ${this.pin().cityName}`);

  /** The lifted label's moment line: "October Bank Holiday · Today". */
  protected readonly momentLine = computed(() => {
    const marker = this.pin().marker;
    return marker ? `${marker.title} · ${marker.when}` : '';
  });
}

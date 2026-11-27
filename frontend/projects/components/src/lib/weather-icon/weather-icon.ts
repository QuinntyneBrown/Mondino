import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { WeatherCondition } from '@mondino/api';

type Shape =
  | 'clear'
  | 'clear-night'
  | 'partly-cloudy'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'rain'
  | 'showers'
  | 'storm'
  | 'fog'
  | 'wind';

const words: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rainy',
  showers: 'Showers',
  storm: 'Stormy',
  fog: 'Foggy',
  wind: 'Windy',
};

/**
 * A weather condition's icon (L2-018), one of the eight drawn in
 * docs/design-system/foundations/iconography.html, bundled with the app. At night a clear or
 * partly cloudy sky takes its night form; the other six have none. It is an image named by the
 * condition's word, unless `decorative`: beside its word, or in a pin's label, whose pin names the
 * word, it is hidden from assistive technology, as the mocks draw it.
 */
@Component({
  selector: 'svg[mo-weather-icon]',
  templateUrl: './weather-icon.html',
  styleUrl: './weather-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'icon',
    viewBox: '0 0 24 24',
    focusable: 'false',
    '[attr.role]': "decorative() ? null : 'img'",
    '[attr.aria-label]': 'decorative() ? null : word()',
    '[attr.aria-hidden]': "decorative() ? 'true' : null",
    '[class.icon--xs]': "size() === 'xs'",
    '[class.icon--sm]': "size() === 'sm'",
  },
})
export class WeatherIcon {
  readonly condition = input.required<WeatherCondition>();
  readonly night = input(false, { transform: booleanAttribute });
  readonly decorative = input(false, { transform: booleanAttribute });
  /** `xs` in a pin's label or a chip, `sm` in a Team row, the default beside text. */
  readonly size = input<'xs' | 'sm' | 'md'>('md');

  protected readonly word = computed(() => words[this.condition()] ?? words.cloudy);

  protected readonly shape = computed<Shape>(() => {
    const condition = this.condition();
    if (!(condition in words)) return 'cloudy';
    if (this.night() && (condition === 'clear' || condition === 'partly-cloudy'))
      return `${condition}-night`;
    return condition;
  });
}

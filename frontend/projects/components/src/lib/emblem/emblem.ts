import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MomentKind } from '@mondino/api';
import { MomentIcon } from '../moment-icon/moment-icon';

/**
 * A moment's emblem (L2-020): its kind's icon in a round sun-coloured badge, `solid` for today's
 * moment or a moment card. Mondino holds no logo (ADR 0019), so the icon is always the kind's own.
 * It stands beside the kind's word, so it is hidden from assistive technology.
 */
@Component({
  selector: 'mo-emblem',
  imports: [MomentIcon],
  templateUrl: './emblem.html',
  styleUrl: './emblem.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'emblem',
    '[class.emblem--solid]': 'solid()',
    '[class.emblem--strong]': 'strong()',
    '[class.emblem--lg]': "size() === 'lg'",
  },
})
export class Emblem {
  readonly kind = input.required<MomentKind>();
  readonly solid = input(false, { transform: booleanAttribute });
  /** In a list's row every emblem takes the solid colours, as the design system draws it. */
  readonly strong = input(false, { transform: booleanAttribute });
  /** `lg` for today's moment on the Moments screen: ink, with the icon in the moment colour. */
  readonly size = input<'md' | 'lg'>('md');
  /** The icon's size: `sm` in a row, `card` in a moment card. */
  readonly iconSize = input<'sm' | 'card'>('sm');
}

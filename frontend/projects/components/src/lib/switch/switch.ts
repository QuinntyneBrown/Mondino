import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MomentKind } from '@mondino/api';
import { Emblem } from '../emblem/emblem';

/**
 * One on-or-off setting (L2-022, L2-034; docs/design-system/components/switch): a button with
 * `role="switch"` and `aria-checked`, operated by a click, a tap, Space or Enter, at least 44px
 * tall. Its label and the optional line under it name it; "On" or "Off" beside the track repeats
 * the state for sight and is hidden from assistive technology. A kind's switch leads with its
 * emblem, out of the moment colour while off.
 */
@Component({
  selector: 'mo-switch',
  imports: [Emblem],
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  readonly checked = input.required({ transform: booleanAttribute });
  readonly label = input.required<string>();
  /** What the state means, under the label. */
  readonly hint = input<string | null>(null);
  /** The kind of moment the switch is for, whose emblem leads it. */
  readonly kind = input<MomentKind | null>(null);

  readonly checkedChange = output<boolean>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MarkerView } from '@mondino/api';
import { MomentIcon } from '../moment-icon/moment-icon';

/**
 * A moment marker (L2-021): the sun disc beside a pin's initials, inside its button, when its
 * teammate has a moment today or in the next 7 days. One moment shows its kind's icon, Mondino
 * holding no emblem (ADR 0019); two or more their count. Today's is larger and ringed. It is not a
 * control, and is hidden from assistive technology: the pin's accessible name gives its moments.
 */
@Component({
  selector: 'span[mo-moment-marker]',
  imports: [MomentIcon],
  templateUrl: './moment-marker.html',
  styleUrl: './moment-marker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'moment-marker',
    'aria-hidden': 'true',
    '[class.moment-marker--today]': 'marker().today',
    '[class.moment-marker--count]': 'marker().count > 1',
  },
})
export class MomentMarker {
  readonly marker = input.required<MarkerView>();
}

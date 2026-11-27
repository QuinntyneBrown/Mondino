import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { DatedMoment } from '@mondino/api';
import { Avatar } from '../avatar/avatar';
import { MomentIcon } from '../moment-icon/moment-icon';

/**
 * One moment on the Moments screen (L2-029): its weekday, day and month, its kind and when ("Local
 * event · In 4 days"), its title and detail, and its teammate's avatar, first name and city
 * ("Jordan · Austin"). The whole row is one link to the Globe with that teammate selected. Its
 * words are data, rendered as text.
 */
@Component({
  selector: 'mo-moment-row',
  imports: [Avatar, MomentIcon],
  templateUrl: './moment-row.html',
  styleUrl: './moment-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MomentRow {
  readonly moment = input.required<DatedMoment>();
  /** The address of the Globe with the teammate selected. */
  readonly address = input.required<string>();

  /** Used with a plain click or Enter; any other click opens the address as a link does. */
  readonly chosen = output<void>();

  protected readonly kind = computed(() => `${this.moment().kindName} · ${this.moment().when}`);

  protected choose(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.chosen.emit();
  }
}

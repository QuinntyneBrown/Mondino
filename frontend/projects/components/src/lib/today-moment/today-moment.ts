import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { DatedMoment } from '@mondino/api';
import { Emblem } from '../emblem/emblem';

/**
 * A moment today, first and most prominent on the Moments screen (L2-029): "Today in Dublin ·
 * Holiday", its emblem, title, detail and teammate's first name, and "On the globe". The whole
 * card is one link to the Globe with that teammate selected. Its words are data, rendered as text.
 */
@Component({
  selector: 'mo-today-moment',
  imports: [Emblem],
  templateUrl: './today-moment.html',
  styleUrl: './today-moment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayMoment {
  readonly moment = input.required<DatedMoment>();
  /** The address of the Globe with the teammate selected. */
  readonly address = input.required<string>();

  /** Used with a plain click or Enter; any other click opens the address as a link does. */
  readonly chosen = output<void>();

  protected readonly kicker = computed(
    () => `Today in ${this.moment().cityName} · ${this.moment().kindName}`,
  );
  protected readonly detail = computed(
    () => `${this.moment().detail} · ${this.moment().firstName}`,
  );

  protected choose(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    this.chosen.emit();
  }
}

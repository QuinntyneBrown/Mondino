import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ALL_MOMENT_KINDS, type MomentFilter, type MomentKind } from '@mondino/api';
import { MomentIcon } from '../moment-icon/moment-icon';

const words: Record<MomentKind, string> = {
  holiday: 'Holiday',
  'formula-1': 'Formula 1',
  'local-event': 'Local event',
  sport: 'Sport',
};

/**
 * The Moments filters (L2-030): "Everything" and each kind with its icon and name, as buttons in
 * one group labelled "Filter by kind". The chosen one is pressed, `aria-pressed="true"`, and drawn
 * filled, so it is told by more than its colour.
 */
@Component({
  selector: 'mo-filter-chips',
  imports: [MomentIcon],
  templateUrl: './filter-chips.html',
  styleUrl: './filter-chips.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChips {
  readonly value = input.required<MomentFilter>();
  readonly valueChange = output<MomentFilter>();

  protected readonly kinds = ALL_MOMENT_KINDS.map((kind) => ({ kind, word: words[kind] }));

  protected choose(value: MomentFilter): void {
    if (value !== this.value()) this.valueChange.emit(value);
  }
}

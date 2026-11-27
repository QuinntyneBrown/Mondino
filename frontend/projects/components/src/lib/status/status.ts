import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Status as StatusValue } from '@mondino/api';

const words: Record<StatusValue, string> = {
  'early-morning': 'Early morning',
  'working-hours': 'Working hours',
  evening: 'Evening',
  'probably-asleep': 'Probably asleep',
};

/**
 * Where a teammate is in their day, as a badge in its words (L2-015): never by colour alone. The
 * dot is decorative. A teammate who does not share their status has no badge at all.
 */
@Component({
  selector: 'mo-status',
  templateUrl: './status.html',
  styleUrl: './status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'status',
    '[class.status--morning]': "status() === 'early-morning'",
    '[class.status--working]': "status() === 'working-hours'",
    '[class.status--evening]': "status() === 'evening'",
    '[class.status--asleep]': "status() === 'probably-asleep'",
  },
})
export class Status {
  readonly status = input.required<StatusValue>();

  protected readonly words = computed(() => words[this.status()]);
}

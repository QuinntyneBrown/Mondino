import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** `sized`: no size of its own; the screen that places it sizes it, as Team's placeholder does. */
export type SkeletonShape =
  'text' | 'short' | 'mid' | 'title' | 'pill' | 'control' | 'avatar' | 'sized';

/**
 * A placeholder in the shape of what is loading. It is decorative: the screen announces the wait
 * in a status of its own. It does not shimmer under reduced motion.
 */
@Component({
  selector: 'mo-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'skeleton',
    'aria-hidden': 'true',
    '[class]': "'skeleton--' + shape()",
  },
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
}

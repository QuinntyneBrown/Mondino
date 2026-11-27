import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The Globe screen's legend over the stage, from 640 px: the night side, a moment this week,
 * teammates close together and how to turn the globe (L2-010). Over the still picture its last
 * entry says why the globe is still, and under 640 px, where the legend is not shown, a line
 * under the globe says it instead (L2-008). It lays itself out in the stage it is placed in.
 */
@Component({
  selector: 'mo-globe-legend',
  templateUrl: './globe-legend.html',
  styleUrl: './globe-legend.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeLegend {
  /** Whether the globe is the still picture. */
  readonly still = input(false);
}

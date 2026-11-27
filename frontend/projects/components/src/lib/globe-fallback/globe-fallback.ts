import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StillPlacement } from '@mondino/api';

/**
 * The still picture of the globe, in the cartoon look the 3D globe aims for. It needs neither
 * WebGL nor the `globe` library. It is not focusable. Given `pins`, it draws a bare pin at each
 * placement (`stillPlacements` in `domain`), in the pin colour, hidden from assistive technology:
 * the label says what they are.
 * The picture is transcribed from the mocks (docs/mocks/pages/not-found/default.html).
 */
@Component({
  selector: 'mo-globe-fallback',
  templateUrl: './globe-fallback.html',
  styleUrl: './globe-fallback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobeFallback {
  /** What the picture is, for someone who cannot see it. */
  readonly label = input('A still picture of the globe');
  /** Bare pins to draw, or none: `null` draws no pin layer at all. */
  readonly pins = input<readonly StillPlacement[] | null>(null);
}

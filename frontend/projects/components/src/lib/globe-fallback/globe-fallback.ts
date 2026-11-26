import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The still picture of the globe, in the cartoon look the 3D globe aims for. It needs neither
 * WebGL nor the `globe` library. No pin is drawn on it and it is not focusable.
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
}

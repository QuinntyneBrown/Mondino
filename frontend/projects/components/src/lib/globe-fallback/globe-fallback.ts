import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
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
  /**
   * The person's own new pin, lifted, labelled ("You · Milan") and pulsing once, drawn with the
   * pins; or null. Its label is text. A saved pin on Profile & Settings has no label and, `still`,
   * does not pulse.
   */
  readonly you = input<
    (StillPlacement & { readonly label: string | null; readonly still?: boolean }) | null
  >(null);

  /**
   * The width of the picture's box in CSS px, as it is first drawn and each time it changes, so
   * the page can place the pins in the `[pins]` slot (ADR 0014). Observed only where listened to.
   */
  readonly widthChange = output<number>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let resizing: ResizeObserver | undefined;
    afterNextRender(() => {
      const box = host.querySelector<HTMLElement>('.globe');
      if (!box || !host.hasAttribute('data-measured')) return;
      resizing = new ResizeObserver(([entry]) => this.widthChange.emit(entry.contentRect.width));
      resizing.observe(box);
    });
    inject(DestroyRef).onDestroy(() => resizing?.disconnect());
  }
}

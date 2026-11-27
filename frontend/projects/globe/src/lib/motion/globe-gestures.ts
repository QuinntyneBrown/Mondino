import type { GlobeMotion } from './globe-motion';

/** A pointer that moves less than this is a tap, kept for selecting a pin (ADR 0013). */
export const TapThresholdPx = 6;

const degreesPerRadian = 180 / Math.PI;

/**
 * Turns input on the globe's box into calls on `GlobeMotion`: a mouse or a pen through pointer
 * events, a finger through touch events (ADR 0013). Every listener is registered with the
 * signal given to `attach`, so aborting it removes them all.
 */
export class GlobeGestures {
  /**
   * @param radiusPx the radius of the globe's disc as drawn, in CSS px: a drag of one radius
   *   turns it one radian, so the place under the pointer follows it.
   * @param turned called after the globe has been turned, so it is drawn.
   */
  constructor(
    private readonly motion: GlobeMotion,
    private readonly radiusPx: () => number,
    private readonly turned: () => void,
  ) {}

  attach(target: HTMLElement, signal: AbortSignal): void {
    this.attachPointer(target, signal);
    this.attachTouch(target, signal);
  }

  /** Turns the globe's front by a drag of `dx`, `dy` CSS px. */
  private dragBy(dx: number, dy: number): void {
    const radius = this.radiusPx();
    if (radius <= 0) return;
    // The front moves with the pointer: right brings the west in, down brings the north in.
    this.motion.dragBy((-dx / radius) * degreesPerRadian, (dy / radius) * degreesPerRadian);
    this.turned();
  }

  /** A mouse or a pen drags through pointer events, captured to the globe until it lets go. */
  private attachPointer(target: HTMLElement, signal: AbortSignal): void {
    let drag: {
      id: number;
      startX: number;
      startY: number;
      x: number;
      y: number;
      moving: boolean;
    } | null = null;
    const end = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moving) {
        this.motion.dragEnd();
        this.turned();
      }
      if (target.hasPointerCapture(drag.id)) target.releasePointerCapture(drag.id);
      drag = null;
    };
    target.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'touch' || event.button !== 0 || drag) return;
        drag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          moving: false,
        };
        target.setPointerCapture(event.pointerId);
      },
      { signal },
    );
    target.addEventListener(
      'pointermove',
      (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        if (!drag.moving) {
          const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
          if (distance < TapThresholdPx) return;
          drag.moving = true;
          this.motion.dragStart();
        }
        this.dragBy(event.clientX - drag.x, event.clientY - drag.y);
        drag.x = event.clientX;
        drag.y = event.clientY;
      },
      { signal },
    );
    target.addEventListener('pointerup', end, { signal });
    target.addEventListener('pointercancel', end, { signal });
    signal.addEventListener('abort', () => {
      if (drag && target.hasPointerCapture(drag.id)) target.releasePointerCapture(drag.id);
      drag = null;
    });
  }

  /**
   * One finger drags through touch events. Its first move decides: a vertical drag the globe
   * cannot follow is left to the page, which scrolls; anything else is taken by the globe.
   */
  private attachTouch(target: HTMLElement, signal: AbortSignal): void {
    let touch: { id: number; x: number; y: number; taken: boolean | null } | null = null;
    const end = (event: TouchEvent) => {
      if (!touch || [...event.touches].some((each) => each.identifier === touch?.id)) return;
      if (touch.taken) {
        this.motion.dragEnd();
        this.turned();
      }
      touch = null;
    };
    target.addEventListener(
      'touchstart',
      (event) => {
        // One finger spins the globe; a second is ignored, as nothing needs two (L2-039).
        if (touch || event.touches.length !== 1) return;
        const [first] = event.touches;
        touch = { id: first.identifier, x: first.clientX, y: first.clientY, taken: null };
      },
      { signal, passive: true },
    );
    target.addEventListener(
      'touchmove',
      (event) => {
        if (!touch) return;
        const moved = [...event.changedTouches].find((each) => each.identifier === touch?.id);
        if (!moved) return;
        const dx = moved.clientX - touch.x;
        const dy = moved.clientY - touch.y;
        if (touch.taken === null) {
          const vertical = Math.abs(dy) > Math.abs(dx);
          touch.taken = !vertical || this.motion.canTurn(0, dy);
          if (touch.taken) this.motion.dragStart();
        }
        if (!touch.taken) return;
        if (event.cancelable) event.preventDefault();
        this.dragBy(dx, dy);
        touch.x = moved.clientX;
        touch.y = moved.clientY;
      },
      { signal, passive: false },
    );
    target.addEventListener('touchend', end, { signal });
    target.addEventListener('touchcancel', end, { signal });
  }
}

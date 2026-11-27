import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { PinPlacement } from '@mondino/api';
import { PinLabel } from '../pin-label/pin-label';

/** The palette's teammate colours: `teammate-1` to `teammate-13`. */
const teammateColour = /^teammate-(1[0-3]|[1-9])$/;

/**
 * The pins over a globe (L2-011 to L2-013, ADR 0014): the mocks' `ul.globe__pins`, one
 * `li.globe__pin` for each placement, holding a `button.pin` named for a screen reader and, for a
 * pin alone, its label, hidden from assistive technology. A pin under the pointer or with
 * keyboard focus lifts, as does the selected one; Enter, Space, a click or a tap selects it.
 * Names, initials and cities are rendered as text (L2-044). It is placed in a globe's `[pins]`
 * slot; the page works out the placements.
 */
@Component({
  selector: 'mo-pin-layer',
  imports: [PinLabel],
  templateUrl: './pin-layer.html',
  styleUrl: './pin-layer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinLayer {
  readonly placements = input.required<readonly PinPlacement[]>();
  /** The selected teammate, or null. */
  readonly selectedId = input<string | null>(null);
  /** The key of the selected group pin, or null. */
  readonly selectedGroupKey = input<string | null>(null);

  /** A pin was chosen: its teammate id. */
  readonly selectPin = output<string>();
  /** A group pin was chosen. */
  readonly selectGroup = output<PinPlacement>();

  private readonly pointed = signal<string | null>(null);
  private readonly focused = signal<string | null>(null);
  /** The placement the pointer is over, or else the one with keyboard focus. */
  protected readonly liftedKey = computed(() => this.pointed() ?? this.focused());

  protected pressed(placement: PinPlacement): boolean {
    return placement.kind === 'group'
      ? placement.key === this.selectedGroupKey()
      : placement.key === this.selectedId();
  }

  protected lifted(placement: PinPlacement): boolean {
    return placement.key === this.liftedKey() || this.pressed(placement);
  }

  protected hue(colour: string): string {
    const match = teammateColour.exec(colour);
    return match ? `hue-${match[1]}` : '';
  }

  protected choose(placement: PinPlacement): void {
    if (placement.kind === 'group') this.selectGroup.emit(placement);
    else this.selectPin.emit(placement.key);
  }

  protected point(key: string | null): void {
    this.pointed.set(key);
  }

  protected leave(key: string): void {
    if (this.pointed() === key) this.pointed.set(null);
  }

  protected focus(key: string | null): void {
    this.focused.set(key);
  }
}

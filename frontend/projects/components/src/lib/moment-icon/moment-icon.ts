import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { MomentKind } from '@mondino/api';

const words: Record<MomentKind, string> = {
  holiday: 'Holiday',
  'formula-1': 'Formula 1',
  'local-event': 'Local event',
  sport: 'Sport',
};

/**
 * A moment kind's own icon (L2-020, ADR 0019): a party popper for a holiday, a flag for Formula 1,
 * a ticket for a local event and a trophy for sport, as the mocks draw them, bundled with the app.
 * Mondino holds no team's or series' logo, so every moment shows its kind's icon. It is an image
 * named by the kind, unless `decorative`: beside the kind's word it is hidden from assistive
 * technology.
 */
@Component({
  selector: 'svg[mo-moment-icon]',
  templateUrl: './moment-icon.html',
  styleUrl: './moment-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'icon',
    viewBox: '0 0 24 24',
    focusable: 'false',
    '[attr.role]': "decorative() ? null : 'img'",
    '[attr.aria-label]': 'decorative() ? null : word()',
    '[attr.aria-hidden]': "decorative() ? 'true' : null",
    '[class.icon--xs]': "size() === 'xs'",
    '[class.icon--sm]': "size() === 'sm'",
    '[class.icon--card]': "size() === 'card'",
  },
})
export class MomentIcon {
  readonly kind = input.required<MomentKind>();
  readonly decorative = input(false, { transform: booleanAttribute });
  /** `xs` in a Team row's pill, `sm` in a row's emblem, `card` in a moment card's. */
  readonly size = input<'xs' | 'sm' | 'card' | 'md'>('md');

  protected readonly shape = computed<MomentKind>(() =>
    this.kind() in words ? this.kind() : 'local-event',
  );
  protected readonly word = computed(() => words[this.shape()]);
}

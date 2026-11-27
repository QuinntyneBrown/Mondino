import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

/** The palette's teammate colours: `teammate-1` to `teammate-13`. */
const teammateColour = /^teammate-(1[0-3]|[1-9])$/;

/**
 * A teammate's initials in their colour. It is decorative: the name it stands for is always
 * given in words beside it, so it is hidden from assistive technology. The initials are text.
 */
@Component({
  selector: 'mo-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    'aria-hidden': 'true',
    '[class]': 'hue()',
    '[class.avatar--xs]': "size() === 'xs'",
    '[class.avatar--sm]': "size() === 'sm'",
    '[class.avatar--lg]': "size() === 'lg'",
    '[class.avatar--ring]': 'ring()',
  },
})
export class Avatar {
  readonly initials = input.required<string>();
  /** A teammate colour of the palette, `teammate-1` to `teammate-13`; any other value draws none. */
  readonly colour = input('');
  readonly size = input<AvatarSize>('md');
  /** A ring in the canvas colour, so avatars that overlap in a group stay apart. */
  readonly ring = input(false, { transform: booleanAttribute });

  protected readonly hue = computed(() => {
    const match = teammateColour.exec(this.colour());
    return match ? `hue-${match[1]}` : '';
  });
}

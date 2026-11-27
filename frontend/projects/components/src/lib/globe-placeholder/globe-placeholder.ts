import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The globe's place while it loads, in a box the globe will take without moving anything. As the
 * mocks draw it: on Join (`globe`), a plain disc with its outline; on the Globe screen (`disc`),
 * the skeleton disc.
 */
@Component({
  selector: 'mo-globe-placeholder',
  templateUrl: './globe-placeholder.html',
  styleUrl: './globe-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobePlaceholder {
  readonly variant = input<'globe' | 'disc'>('globe');
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The globe's place while it loads: a plain disc with its outline, and no pins. */
@Component({
  selector: 'mo-globe-placeholder',
  templateUrl: './globe-placeholder.html',
  styleUrl: './globe-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobePlaceholder {}

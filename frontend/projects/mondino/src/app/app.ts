import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SkipLink } from '@mondino/components';

/** The root: "Skip to content", first on every screen, and the router outlet. Nothing else. */
@Component({
  selector: 'mo-root',
  imports: [RouterOutlet, SkipLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}

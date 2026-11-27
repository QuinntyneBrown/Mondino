import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TeammatePanelContent } from '@mondino/api';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { OverlapBar } from '../overlap-bar/overlap-bar';
import { Status } from '../status/status';
import { WeatherIcon } from '../weather-icon/weather-icon';

/**
 * A selected teammate, in the panel beside the globe (L2-023): their avatar, name ("(you)" on
 * the viewer's own), city and country, local time, own day and offset, status, weather and the
 * working-hours overlap, or the private note in place of the last three for a teammate who shares
 * neither. Whatever is null is left out. The heading takes focus by script (`tabindex="-1"`).
 * Names and the city are data, rendered as text. There is no "Message" button.
 */
@Component({
  selector: 'mo-teammate-panel',
  imports: [Avatar, Button, OverlapBar, Status, WeatherIcon],
  templateUrl: './teammate-panel.html',
  styleUrl: './teammate-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeammatePanel {
  readonly content = input.required<TeammatePanelContent>();
  readonly clockFormat = input<'24-hour' | '12-hour'>('24-hour');

  /** The close button was used. */
  readonly closed = output();
}

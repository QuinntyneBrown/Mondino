import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The icons a notice can carry: a broken link, or no connection. */
export type NoticeIcon = 'link-off' | 'offline';

/**
 * A notice that takes a form's place: an icon, a title, a line and a way on. The title is the
 * screen's heading. The title and the line are text; the way on is projected into `actions`.
 */
@Component({
  selector: 'mo-notice',
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notice {
  readonly icon = input.required<NoticeIcon>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}
